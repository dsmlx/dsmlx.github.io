# 复制 JWT 声明到 HTTP 头

`outputClaimToHeaders` 把验证后的单个声明复制到请求头；
`outputPayloadToHeader` 把完整 JSON payload 写入请求头。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: RequestAuthentication
metadata:
  name: httpbin-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
    - issuer: https://issuer.example.com
      jwksUri: https://issuer.example.com/.well-known/jwks.json
      fromHeaders:
        - name: authorization
          prefix: "Bearer "
      fromCookies: [session]
      forwardOriginalToken: false
      outputPayloadToHeader: x-jwt-payload
      outputClaimToHeaders:
        - claim: sub
          header: x-jwt-sub
        - claim: profile.team
          header: x-jwt-team
```

注意：

- 嵌套声明使用点分路径，例如 `profile.team`。
- 输出头由代理先清除后写入，业务不得信任绕过代理的流量。
- 完整 payload 可能较大或包含敏感信息；优先只复制业务必需的声明。
- `forwardOriginalToken: false` 可避免上游业务无意继续传播 bearer token。
