# 认证

Dubbo Inherent Mesh 提供两层认证：

- `PeerAuthentication` 使用工作负载证书认证服务身份，并控制入站 mTLS 模式。
- `RequestAuthentication` 校验 HTTP JWT，生成 `iss/sub` 请求身份，并可把声明安全地复制到上游请求头。

认证只确认“是谁”。是否允许访问由 `AuthorizationPolicy` 决定。单独部署
`RequestAuthentication` 时，无令牌请求仍可通过；无效令牌返回 `401`。

## 快速检查

```bash
kubectl get peerauthentication,requestauthentication -A
kubectl get authorizationpolicy -A
```

生产环境建议按以下顺序启用：

1. 以 `PERMISSIVE` 接入工作负载证书。
2. 部署并验证 JWT 规则。
3. 用 `AuthorizationPolicy` 强制请求身份。
4. 确认所有调用方完成迁移后，把 mTLS 切换为 `STRICT`。

继续阅读：

- [认证策略](authn-policy.md)
- [基于 JWT 声明的路由](jwt-route.md)
- [复制 JWT 声明到 HTTP 头](claim-to-header.md)
- [双向 TLS 迁移](mtls-migration.md)
