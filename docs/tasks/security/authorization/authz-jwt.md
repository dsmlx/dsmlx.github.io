# JWT 令牌授权

JWT 认证与授权必须组合配置：认证策略验证签名、issuer 和 audience；授权策略使用
生成的 `requestPrincipal` 或声明。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: allow-admins
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
      when:
        - key: request.auth.claims[groups]
          values: [admin]
      to:
        - operation:
            methods: [GET]
```

`requestPrincipal` 使用 `<issuer>/<subject>`。数组声明会逐值匹配。避免只判断客户端
可写的普通 HTTP 头；需要路由或传递声明时，使用 `outputClaimToHeaders`。
