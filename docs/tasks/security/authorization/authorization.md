# 授权

`AuthorizationPolicy` 对 HTTP、TCP 和基于 mTLS 的工作负载流量执行访问控制。
策略按目标 workload 的 namespace 和 selector 生效。

动作执行顺序：

1. `CUSTOM` 把匹配请求交给外部授权服务。
2. `DENY` 明确拒绝匹配请求。
3. 存在 ALLOW 策略时，只允许至少匹配一条 ALLOW 规则的请求。
4. `AUDIT` 或 `dryRun: true` 只记录结果，不改变请求结果。

支持的来源属性包括 mTLS principal、namespace、ServiceAccount、直接源 IP、
可信代理解析的原始客户端 IP，以及 JWT `requestPrincipal`。HTTP 操作可匹配 host、
port、method、path；TCP 策略只使用 L4 可获得的属性。

```bash
kubectl get authorizationpolicy -A
kubectl describe authorizationpolicy -n default
```

从 AUDIT 或 `dryRun` 开始，观察命中，再启用 DENY/ALLOW。继续阅读：

- [HTTP 流量](authz-http.md)
- [TCP 流量](authz-tcp.md)
- [JWT 令牌](authz-jwt.md)
- [外部授权](authz-custom.md)
- [明确拒绝](authz-deny.md)
- [Ingress 网关](authz-ingress.md)
- [信任域迁移](authz-td-migration.md)
- [模拟运行](authz-dry-run.md)
