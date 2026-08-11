# Ingress 网关授权

Ingress 有两种 IP：

- `ipBlocks` 匹配代理实际 TCP 对端地址，通常是负载均衡器或上游代理。
- `remoteIpBlocks` 匹配从可信代理头解析出的原始客户端地址。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: allow-office
  namespace: default
spec:
  selector:
    matchLabels:
      gateway.networking.k8s.io/gateway-name: public
  action: ALLOW
  rules:
    - from:
        - source:
            remoteIpBlocks: [203.0.113.0/24]
```

只有入口前置代理受信任并会覆盖客户端提供的转发头时，才使用 `remoteIpBlocks`。
错误的可信代理边界会允许伪造 IP。直连或保留源地址的 LoadBalancer 可使用
`ipBlocks`。先记录实际下游地址，再启用强制策略。
