# 链路追踪

链路追踪用于把一次请求经过的网关、路由和上游调用串成同一条 trace。追踪通过网格配置(`meshConfig`)开启:声明一个 OpenTelemetry `extensionProvider`,再打开 `enableTracing`。开启后:

- 托管 `Gateway`(dxgate)自动向 provider 上报 span:提取入站 `traceparent`,为当前请求创建 span,并向上游注入新的 `traceparent`;
- 注入的 proxyless 工作负载自动获得标准 OpenTelemetry 环境变量(`OTEL_EXPORTER_OTLP_ENDPOINT` 等),应用内的 OTel SDK 无需改代码即可上报到同一个 collector。

通过 operator 安装 Jaeger all-in-one(Service 名为 `tracing`,OTLP gRPC 端口 4317):

```bash
dubboctl install --set components.tracing.enabled=true
```

或使用 demo 配置档一并安装完整观测栈。也可以直接 apply 示例清单:

```bash
kubectl apply -f samples/addons/tracing.yaml
```

如果希望先经过 OpenTelemetry Collector 再转发,额外部署:

```bash
kubectl apply -f samples/addons/opentelemetry.yaml
```

## 网格级开启追踪

在 `DubboOperator` 的 `meshConfig` 中声明 provider 并开启追踪:

```bash
cat <<EOF > ./tracing.yaml
apiVersion: install.dubbo.apache.org/v1alpha1
kind: DubboOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: jaeger
      opentelemetry:
        port: 4317
        service: tracing.dubbo-system.svc.cluster.local
EOF
dubboctl install -f ./tracing.yaml --skip-confirmation
```

`service` 指向任意 OTLP gRPC collector;经过 Collector 转发时改为 `opentelemetry-collector.dubbo-system.svc.cluster.local`。`meshConfig` 会合并进 `dubbo-system` 命名空间的 `dubbo` ConfigMap,dubbod 热加载,不需要重启控制面。

`meshConfig` 内容在安装时按 MeshConfig 模式严格校验,字段写错会直接报错而不是被静默忽略。

已注入的工作负载 Pod 需要滚动一次才能拿到新的 OTEL 环境变量(注入发生在 Pod 创建时):

```bash
kubectl -n <ns> rollout restart deploy/<name>
```

## 使用 Telemetry 资源调整追踪行为

`Telemetry`(`telemetry.dubbo.apache.org/v1alpha1`)按命名空间粒度选择 provider、调整采样率或关闭上报。放在根命名空间 `dubbo-system` 时对全网格生效:
- `providers[].name` 必须引用声明的 provider 名;指定后即使没有 `enableTracing` 也会开启该范围的追踪。
- `randomSamplingPercentage` 取值 0.00–100.00,默认 100。
- `disableSpanReporting: true` 关闭该范围的 span 上报。
- 生效范围:
  - 网关命名空间的 `Telemetry` 优先于 `dubbo-system` 的;
  - 带 `selector` 的 `Telemetry` 只作用于匹配的工作负载,不作用于托管网关。
- 优先级:Gateway 注解 > Telemetry 资源 > `meshConfig` 网格默认值。

当前限制: proxyless 工作负载的 OTEL 环境变量在注入时按 `meshConfig` 决定,`Telemetry` 的采样率和 provider 切换先对托管网关生效。

```bash
kubectl apply -f - <<EOF
apiVersion: telemetry.dubbo.apache.org/v1alpha1
kind: Telemetry
metadata:
  name: mesh-default
  namespace: dubbo-system
spec:
  tracing:
  - providers:
    - name: jaeger
    randomSamplingPercentage: 25
EOF
```

## 按 Gateway 覆盖

单个 Gateway 可以用注解覆盖网格默认值:

```bash
kubectl -n default annotate gateway httpbin-gateway \
  gateway.dubbo.apache.org/otel-endpoint=http://tracing.dubbo-system.svc:4317 \
  gateway.dubbo.apache.org/otel-sampling-percentage=100 \
  gateway.dubbo.apache.org/otel-service-name=dxgate.default.httpbin-gateway \
  --overwrite
```

等待 dxgate 重新渲染并滚动:

```bash
kubectl -n default rollout status deploy/dxgate-gateway
```

## 产生流量

```bash
kubectl -n default run curl --image=curlimages/curl --rm -it --restart=Never -- \
  curl -sS -H "traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01" \
  http://httpbin.default.svc.cluster.local/get
```

dxgate span 会带有 `gateway`、`namespace`、`route`、`cluster`、`method`、`status`、`latency`、`upstream` 等属性。

## 查看结果

```bash
dubboctl dashboard tracing
```

浏览器打开 `http://127.0.0.1:16686`,选择对应 service name 查询 trace。网关默认为 `dxgate.<namespace>.<gateway>`,注入工作负载默认为 `<deployment>.<namespace>`。

## 清理

```bash
kubectl -n dubbo-system delete telemetry mesh-default
kubectl -n default annotate gateway httpbin-gateway \
  gateway.dubbo.apache.org/otel-endpoint- \
  gateway.dubbo.apache.org/otel-sampling-percentage- \
  gateway.dubbo.apache.org/otel-service-name-
kubectl delete -f samples/addons/opentelemetry.yaml
kubectl delete -f samples/addons/tracing.yaml
```
