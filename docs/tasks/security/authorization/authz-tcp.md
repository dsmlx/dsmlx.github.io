# TCP 流量授权

dxproxy 在 L4 入站路径执行基于 mTLS 身份、namespace、ServiceAccount、IP 和端口的
ALLOW、DENY 与模拟运行策略。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: ledger-tcp
  namespace: payments
spec:
  selector:
    matchLabels:
      app: ledger
  action: ALLOW
  rules:
    - from:
        - source:
            namespaces: [checkout]
            serviceAccounts: [checkout/checkout-api]
      to:
        - operation:
            ports: ["50051"]
```

TCP 请求没有 HTTP method、host 或 path。不要在 TCP workload 上使用这些字段，
否则规则无法按预期匹配。工作负载身份只有在 mTLS 成功后可信；生产环境应把目标
`PeerAuthentication` 设为 `STRICT`。
