# 证书管理

dubbod 为工作负载签发 SPIFFE 证书，数据面通过 SDS 获取证书和信任根。可选择：

- 内置 CA：适合本地开发与默认安装。
- 插入 CA Secret：使用组织现有根或中间 CA。
- Kubernetes CSR signer：把签发委托给集群 signer。

生产环境要求：

- CA 私钥只存在于受限 namespace，使用最小 RBAC。
- 轮换前同时分发新旧信任根，待工作负载证书全部更新后再移除旧根。
- 监控签发失败、证书到期和 SDS 更新。
- 不把示例私钥提交到 Git。

继续阅读[插入 CA 证书](plugin-ca-cert.md)和
[使用 Kubernetes CSR 自定义 CA 集成](custom-ca-k8s.md)。
