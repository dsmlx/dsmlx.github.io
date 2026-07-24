> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

> 本任务使用 Gateway API 流量面。

熔断限制发往后端的并发请求。达到上限后，dxgate 会直接返回 `503`，避免故障后端继续拖垮入口。

## 部署示例

```bash
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```

本地验证使用端口转发：

```bash
kubectl port-forward svc/dxgate-gateway 18080:80
```

确认路由正常：

```bash
curl -s http://127.0.0.1:18080/get
```

## 配置熔断

`CircuitBreakerPolicy` 使用 Gateway API policy attachment 方式附着到后端 `Service`。下面的配置把 `httpbin` 后端的并发请求限制为 `1`：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: CircuitBreakerPolicy
metadata:
  name: httpbin-circuit-breaker
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: httpbin
  connectionPool:
    http2MaxRequests: 1
    maxConnections: 1
EOF
```

等待 dxgate runtime 配置刷新：

```bash
kubectl rollout status deploy/dxgate-gateway
```

## 验证

`/delay/2` 会让后端保持请求 2 秒。并发两个请求时，一个请求会进入后端，另一个请求会被熔断：

```bash
seq 1 2 | xargs -I{} -P2 sh -c 'curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18080/delay/2'
```

预期输出包含一次 `503`：

```text
200
503
```

也可以查看 dxgate runtime 配置：

```bash
kubectl port-forward deploy/dxgate-gateway 16021:26021
curl -s http://127.0.0.1:16021/debug/clusters | jq '.[] | select(.name | contains("httpbin")) | .circuit_breaker'
```

预期能看到 `http2_max_requests: 1`。

## 清理

```bash
kubectl delete circuitbreakerpolicy httpbin-circuit-breaker
kubectl delete -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```
