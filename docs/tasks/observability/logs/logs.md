# 访问日志

Telemetry API 为 Inherent gRPC 应用和受管 `dxgate` 网关开启访问日志。日志由应用进程或网关直接生成，通过 OTLP 发送到 OpenTelemetry Collector，不需要日志 sidecar。

## 安装采集器

```bash
kubectl apply -f samples/addons/opentelemetry.yaml
kubectl -n dubbo-system rollout status deployment/opentelemetry-collector
```

## 开启网格访问日志

下面配置为 Client 和 Server 开启 OTLP 访问日志，并添加静态属性：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: telemetry.dubbo.apache.org/v1alpha3
kind: Telemetry
metadata:
  name: logging-tags
  namespace: dubbo-system
spec:
  logging:
  - providers:
    - name: otel
    match:
      mode: CLIENT_AND_SERVER
    tags:
    - name: environment
      value: production
EOF
```

在业务命名空间创建无 `selector` 的 Telemetry 可覆盖网格配置；带 `selector.matchLabels` 的配置只作用于匹配工作负载。`mode` 支持 `CLIENT`、`SERVER` 和 `CLIENT_AND_SERVER`。

## 过滤和关闭日志

只记录失败请求：

```yaml
spec:
  logging:
  - providers:
    - name: otel
    filter:
      expression: response.code >= 500
```

关闭匹配工作负载的日志：

```yaml
spec:
  selector:
    matchLabels:
      app: payment
  logging:
  - providers:
    - name: otel
    disabled: true
```

过滤器支持对 `response.code`、gRPC 状态、请求方法和 reporter 等访问日志字段做比较。无效表达式不会放宽日志范围。

## 验证

产生一次流量后查看 Collector：

```bash
kubectl -n dubbo-system logs deployment/opentelemetry-collector --since=2m
```

记录包含 reporter、服务或路由、方法、状态、耗时及配置的静态标签。`dxgate` 同时保留标准输出访问日志；OTLP 日志由 Telemetry 配置控制。

## 清理

```bash
kubectl -n dubbo-system delete telemetry logging-tags
kubectl delete -f samples/addons/opentelemetry.yaml
```
