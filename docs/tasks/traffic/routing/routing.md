> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

> 本任务使用 `moviereview` 示例。


## URI 路由

下面的规则把绑定到 `moviepage` 服务，根据 URI 前缀把请求转发到 `details` 或 `reviews`。 `rules` 按顺序匹配。把精确规则放在前面，把更宽泛的规则放在后面，不写 `matches` 的规则作为默认兜底。

```bash
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: moviepage-routing
  namespace: moviereview
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: moviepage
    port: 9080
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /details
    backendRefs:
    - name: details
      port: 9080
  - matches:
    - path:
        type: PathPrefix
        value: /reviews
    backendRefs:
    - name: reviews
      port: 9080
EOF
```

## Header 路由

下面的规则把绑定到 `reviews` 服务。`jason` 用户的请求进入 `reviews-v1`，其余流量按权重进入 `reviews-v2` 和 `reviews-v3`。

```bash
kubectl apply -f - <<EOF
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: reviews-routing
  namespace: moviereview
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: reviews
    port: 9080
  rules:
  - matches:
    - headers:
      - name: end-user
        value: jason
    backendRefs:
    - name: reviews-v1
      port: 9080
      weight: 100
  - backendRefs:
    - name: reviews-v2
      port: 9080
      weight: 20
    - name: reviews-v3
      port: 9080
      weight: 80
EOF
```

## 查看资源

```bash
kubectl get httproute -n moviereview
```

## 验证

默认提供 `proto.XDSTestService/ForwardHTTP` 测试入口。先把 17171 转发到本地，后续 `grpcurl` 都打这个端口。带 `end-user: jason` Header 的请求会触发 Header 路由。

```bash
kubectl -n dubbo-system port-forward deploy/dubbod 17171:17171
```

确认 `/details` 被路由到 `details`：

```bash
grpcurl -plaintext \
  -d '{"url":"xds:///moviepage.moviereview.svc.cluster.local:9080","path":"/details"}' \
  :17171 proto.XDSTestService/ForwardHTTP | jq -r '.output[0]'
```

预期能看到 `details` 返回的电影详情：

```text
{"title":"银河补习班","year":2019,"director":"Deng Chao",...}
```

确认 `/reviews` 被路由到 `reviews`：

```bash
grpcurl -plaintext \
  -d '{"url":"xds:///moviepage.moviereview.svc.cluster.local:9080","path":"/reviews","count":5}' \
  :17171 proto.XDSTestService/ForwardHTTP | jq -r '.output | join("")'
```

预期能看到 `reviews` 返回：

```text
reviews v1
reviews v2
```

确认带 `jason` Header 的请求只进入 `v1`：

```bash
grpcurl -plaintext \
  -d '{"url":"xds:///reviews.moviereview.svc.cluster.local:9080","path":"/reviews","count":5,"headers":["end-user=jason"]}' \
  :17171 proto.XDSTestService/ForwardHTTP | jq -r '.output | join("")'
```

预期请求返回只包含 `v1`：

```text
reviews v1
reviews v1
```

也可以登录 `jason` 后刷新 `frontend` 页面验证。页面里的 moviepage 会通过本地 `reviews-grpc-outbound` 调用 `reviews`，登录 `jason` 时页面上的 reviews 版本应保持 `v1`。

确认不带 `end-user` Header 的请求按默认权重进入 `v2` 和 `v3`：

```bash
grpcurl -plaintext \
  -d '{"url":"xds:///reviews.moviereview.svc.cluster.local:9080","path":"/reviews","count":5}' \
  :17171 proto.XDSTestService/ForwardHTTP | jq -r '.output | join("")'
```

预期请求返回只包含 `v2` 和 `v3`：

```text
reviews v3
reviews v2
reviews v3
```

## 清理

```bash
kubectl delete httproute moviepage-routing -n moviereview
kubectl delete httproute reviews-routing -n moviereview
```
