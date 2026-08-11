# 基于 JWT 声明的路由

先用 `RequestAuthentication` 验证令牌，再把受信任声明复制到内部请求头；
Gateway API `HTTPRoute` 只匹配这个由代理重写的头，不直接信任客户端输入。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: RequestAuthentication
metadata:
  name: shop-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: shop-gateway
  jwtRules:
    - issuer: https://issuer.example.com
      jwksUri: https://issuer.example.com/.well-known/jwks.json
      outputClaimToHeaders:
        - claim: group
          header: x-jwt-group
---
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: default
spec:
  parentRefs:
    - name: shop-gateway
  rules:
    - matches:
        - headers:
            - name: x-jwt-group
              value: beta
      backendRefs:
        - name: shop-v2
          port: 8080
    - backendRefs:
        - name: shop-v1
          port: 8080
```

dxgate 会在 JWT 验证前移除客户端伪造的输出头，再写入验证后的声明。仍应配合
`AuthorizationPolicy` 限制合法的 `requestPrincipals`，否则无令牌请求可能进入
默认路由。
