# HTTP 流量授权

以下策略只允许已认证用户读取 `/users`：

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: allow-users-read
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
    - from:
        - source:
            requestPrincipals:
              - https://issuer.example.com/*
      to:
        - operation:
            methods: [GET]
            paths: [/users*]
```

一旦某个 workload 命中任何 ALLOW 策略，未匹配请求默认拒绝。HTTP path 尾部
`*` 表示前缀匹配；method 使用大写。先配置 `RequestAuthentication`，否则
`requestPrincipals` 不会生成。

```bash
curl -i http://gateway.example/users
curl -i -H "Authorization: Bearer ${TOKEN}" http://gateway.example/users
```

预期第一条返回 `403`，合法令牌返回后端响应，无效令牌在授权前返回 `401`。
