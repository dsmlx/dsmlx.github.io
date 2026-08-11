# 明确拒绝

DENY 优先于 ALLOW，适合封禁高风险路径或来源：

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: deny-admin-public
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: DENY
  rules:
    - from:
        - source:
            notRemoteIpBlocks: [10.0.0.0/8]
      to:
        - operation:
            paths: [/admin*]
```

先用 `dryRun: true` 验证来源 IP 和路径命中。对 TCP 流量不要依赖 HTTP 字段。
空规则或过宽 selector 可能拒绝整个 namespace；发布前检查渲染后的 YAML。
