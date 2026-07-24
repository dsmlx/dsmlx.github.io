> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

> 本任务使用 `samples/moviereview` 示例。

请求超时是客户端等待上游 HTTP 响应的最长时间。超过这个时间后，xDS 客户端会取消本次请求。

## 部署

```bash
kubectl create ns moviereview
kubectl label namespace moviereview dubbo-injection=enabled
kubectl apply -f samples/moviereview/deployment.yaml
```

## 配置请求超时

同一个父 Service 只保留本任务的 `HTTPRoute`。如果刚执行过流量路由或流量转移任务，旧规则也会绑定 `reviews`，验证时会看到旧路由。

```bash
kubectl -n moviereview delete httproute moviepage-routing reviews-routing reviews-canary
```

下面的规则把 `reviews` 请求转发到 `reviews-v2`，并把请求超时设置为 `500ms`：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: reviews-timeout
  namespace: moviereview
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: reviews
    port: 9080
  rules:
  - timeouts:
      request: 500ms
    backendRefs:
    - name: reviews-v2
      port: 9080
EOF
```

## 验证

先把 `dubbod` 的测试入口转发到本地：

```bash
kubectl -n dubbo-system port-forward deploy/dubbod 17171:17171
```

正常超时时间下，请求应该返回 `reviews-v2`：

```bash
grpcurl -plaintext \
  -d '{"url":"xds:///reviews.moviereview.svc.cluster.local:9080","path":"/reviews"}' \
  :17171 proto.XDSTestService/ForwardHTTP | jq -r '.output | join("")'
```

预期输出包含 `v2`：

```text
reviews v2
```

把超时临时改成 `1ms`，验证请求会被取消：

```bash
kubectl -n moviereview patch httproute reviews-timeout --type='merge' -p '
{
  "spec": {
    "rules": [
      {
        "timeouts": {
          "request": "1ms"
        },
        "backendRefs": [
          {
            "name": "reviews-v2",
            "port": 9080
          }
        ]
      }
    ]
  }
}'
```

再次请求：

```bash
grpcurl -plaintext \
  -d '{"url":"xds:///reviews.moviereview.svc.cluster.local:9080","path":"/reviews"}' \
  :17171 proto.XDSTestService/ForwardHTTP
```

预期返回 `context deadline exceeded`：

```text
ERROR:
  Code: Unknown
  Message: Get "http://.../reviews": context deadline exceeded
```

恢复 `500ms` 后，请求应重新成功：

```bash
kubectl -n moviereview patch httproute reviews-timeout --type='merge' -p '
{
  "spec": {
    "rules": [
      {
        "timeouts": {
          "request": "500ms"
        },
        "backendRefs": [
          {
            "name": "reviews-v2",
            "port": 9080
          }
        ]
      }
    ]
  }
}'
```

## 清理

```bash
kubectl -n moviereview delete httproute reviews-timeout
kubectl delete -f samples/moviereview/deployment.yaml
kubectl delete ns moviereview
```
