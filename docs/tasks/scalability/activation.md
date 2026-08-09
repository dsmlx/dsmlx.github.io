# 配置按需激活

本任务把 HTTP/unary gRPC Service 缩到零，并验证南北向或 proxyless 东西向的首个请求能完成。概念背景见[按需激活](../../concepts/scalability.md)。

## 1. 安装 KEDA

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm upgrade --install keda kedacore/keda -n keda --create-namespace
```

## 2. 部署目标与 Activator

创建命名空间、注入目标，并创建名为 `dxgate-gateway` 的专用 Activator Gateway。仓库 `samples/activation` 提供完整清单：

```bash
kubectl create ns activation
kubectl label ns activation dubbo-injection=enabled
kubectl apply -f samples/activation/payment.yaml
```

`dubbod` 会为 `dxgate-gateway` 创建 dxgate Deployment/Service，并注入 activation 控制面地址。

## 3. 声明策略

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: ServiceActivationPolicy
metadata:
  name: payment
  namespace: activation
spec:
  targetRef:
    kind: Service
    name: payment
  autoscalerRef:
    group: keda.sh
    kind: ScaledObject
    name: payment
  protocols: [HTTP, GRPC_UNARY]
  requestTimeout: 30s
  maxPendingRequests: 100
  backendServiceAccounts: [payment]
```

```bash
kubectl apply -f samples/activation/activation-policy.yaml
```

`backendServiceAccounts` 是东西向 mTLS 的后端身份边界，生产环境不要使用通配值。

## 4. 让 KEDA 读取 pending

```bash
kubectl apply -f samples/activation/scaledobject.yaml
```

`minReplicaCount` 为 0，external scaler 地址是 `dubbod-activation.dubbo-system.svc.cluster.local:26030`。不要同时用 Deployment replicas 或 HPA 写副本数。

## 5. 验证

```bash
kubectl -n activation wait --for=condition=Ready scaledobject/payment --timeout=180s
kubectl -n activation get serviceactivationpolicy payment \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\n"}{end}'
kubectl -n activation get deploy payment -w
```

状态应包含 `Accepted=True`、`Eligible=True`、`ScalerReady=True`、`ActivatorReady=True`。等 Deployment 到 `0/0` 后发送请求：

```bash
time curl -s http://$GATEWAY/payment/healthz
```

请求在冷启动期间等待并最终成功。东西向验证可从注入的 proxyless 客户端调用 `payment.activation.svc.cluster.local`；冷时经过 Activator，热 EDS 收敛后直接访问后端。

查看 Activator：

```bash
kubectl -n activation port-forward deploy/dxgate-gateway 15021:26021
curl -s localhost:15021/metrics | grep dxgate_activation_requests_held
curl -s localhost:15021/debug/config
```

## 排查

- `Accepted=False`：策略字段或目标引用非法。
- `Eligible=False`：目标 Service 不存在或协议不支持。
- `ScalerReady=False`：`ScaledObject` 不存在或未 Ready。
- `ActivatorReady=False`：`dxgate-gateway` 未 Programmed。
- pending 上升但副本仍为 0：检查 KEDA external scaler 地址、dubbod activation Service 和控制面日志。
- 401/502 或 TLS 握手失败：检查 `backendServiceAccounts` 是否同时匹配目标与 Activator 身份。

流式 RPC、长连接与启动时间超过调用方 deadline 的服务使用 `minReplicaCount: 1`。
