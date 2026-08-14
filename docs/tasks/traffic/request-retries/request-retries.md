# 请求重试

本任务使用 Gateway API `HTTPRoute.rules[].retry` 为服务间 Inherent 出站请求配置自动重试。控制面会把策略转换成 xDS RDS `RouteAction.RetryPolicy`，数据面在连接失败、连接重置或命中指定 HTTP 状态码时重新选择端点。

## 前提

`retry` 在 Gateway API v1.4.1 中属于 Extended/Experimental 字段。集群必须安装 experimental CRD，standard CRD 会删除或拒绝该字段：

```shell
kubectl apply -f https://github.com/kubernetes-sigs/gateway-api/releases/download/v1.4.1/experimental-install.yaml
```

确认 CRD 已包含重试字段：

```shell
kubectl explain httproute.spec.rules.retry
```

同一个父 Service 只保留本任务的 `HTTPRoute`，避免其他规则先被匹配：

```shell
kubectl -n moviereview delete httproute \
  moviepage-routing reviews-routing reviews-canary reviews-timeout \
  --ignore-not-found
```

## 配置

下面的规则在连接失败、连接重置以及 HTTP `500`、`502`、`503`、`504` 时最多重试 3 次。每次上游调用最多等待 1 秒，初次请求和全部重试合计不能超过 5 秒；第一次重试至少等待 100 毫秒，后续使用指数退避，最大为 1 秒。

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: reviews-retry
  namespace: moviereview
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: reviews
    port: 9080
  rules:
  - retry:
      attempts: 3
      codes:
      - 500
      - 502
      - 503
      - 504
      backoff: 100ms
    timeouts:
      request: 5s
      backendRequest: 1s
    backendRefs:
    - name: reviews-v1
      port: 9080
      weight: 50
    - name: reviews-v2
      port: 9080
      weight: 50
```

应用并确认资源通过 CRD 校验：

```shell
kubectl apply -f reviews-retry.yaml
kubectl -n moviereview get httproute reviews-retry -o yaml
```

## 验证

先把 dubbod 的测试入口转发到本地：

```shell
kubectl -n dubbo-system port-forward deploy/dubbod 17171:17171
```

从另一个终端发送真实请求：

```shell
grpcurl -plaintext \
  -d '{"url":"xds:///reviews.moviereview.svc.cluster.local:9080","path":"/reviews","count":20}' \
  :17171 proto.XDSTestService/ForwardHTTP | jq -r '.output | join("")'
```

正常情况下输出会来自 `reviews-v1` 和 `reviews-v2`。验证重试时，让一个测试后端返回配置中的 `503`，或让首选测试端点拒绝连接；Inherent outbound 客户端会在总请求超时内选择下一个端点。把返回码改成未配置的 `501` 时，不会触发状态码重试。

## 语义与边界

- `attempts` 是重试次数，不包含初次请求；`attempts: 3` 最多产生 4 次上游调用。
- 只应对能够安全重放的幂等请求启用自动重试，避免重复写入、扣款或创建资源。
- `timeouts.request` 是整个逻辑请求的时间预算，包含退避等待；预算耗尽后立即取消后续尝试。
- `timeouts.backendRequest` 是每一次上游调用的独立超时。
- `CircuitBreakerPolicy.connectionPool.maxRetries` 是并发重试容量上限，不是重试触发策略。
- 当前 HTTPRoute 重试执行面是项目提供的 Inherent outbound 数据面；入站 L4 `dxproxy` 不终止 HTTP/gRPC 协议，因此不会重放应用请求。

## 清理

```shell
kubectl -n moviereview delete httproute reviews-retry
```
