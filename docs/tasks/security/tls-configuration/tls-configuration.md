# TLS 配置

网格 TLS 配置同时包含证书身份、最低协议版本和目标 SAN 校验。生产基线：

- 工作负载 `PeerAuthentication` 使用 `STRICT`。
- `minimumTlsVersion` 至少为 `TLSV1_2`；条件允许时使用 `TLSV1_3`。
- 出站连接验证目标 workload 的 SPIFFE URI SAN。
- 外部 HTTPS 后端使用 `BackendTLSPolicy` 配置 CA 与 hostname。

协议版本不能替代身份校验。即使握手使用 TLS 1.3，也必须验证证书链和目标 SAN。
变更全网格最低版本前，先盘点旧客户端并做分阶段迁移。
