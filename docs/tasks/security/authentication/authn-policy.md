# 认证策略

本任务为 `httpbin` 同时配置工作负载 mTLS 和最终用户 JWT 认证。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: PeerAuthentication
metadata:
  name: httpbin
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  mtls:
    mode: PERMISSIVE
---
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
      audiences: [httpbin]
      jwksUri: https://issuer.example.com/.well-known/jwks.json
```

```bash
kubectl apply -f authentication.yaml
kubectl get peerauthentication,requestauthentication -n default
```

验证预期：

- 不带 JWT：认证过滤器不拒绝，请求继续进入授权阶段。
- 无效、过期、issuer 或 audience 不匹配：返回 `401`。
- 有效 JWT：生成 `<issuer>/<subject>` 形式的 `requestPrincipal`。
- `PERMISSIVE`：同时接收明文与 mTLS；完成迁移后改为 `STRICT`。

不要把认证当作授权。要强制必须登录，添加仅允许
`requestPrincipals` 的 ALLOW 策略。
