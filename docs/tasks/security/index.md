# 安全任务

Dubbo Inherent Mesh 的安全路径覆盖控制面 API、Kubernetes client、xDS、dxproxy、
dxgate、grpc-engine、Helm 和证书签发。各任务当前执行面如下：

| 能力 | 执行面 | 状态 |
| --- | --- | --- |
| mTLS 迁移、STRICT/PERMISSIVE | grpc-engine、dxproxy | 支持 |
| JWT 校验、声明头、声明路由 | dxgate | 支持 |
| HTTP ALLOW、DENY、AUDIT | dxgate | 支持 |
| TCP 身份、namespace、ServiceAccount、IP、端口授权 | dxproxy | 支持 |
| CUSTOM HTTP 外部授权 | dxgate | 支持 |
| 信任域 alias、最低 TLS 版本 | 控制面与数据面 | 支持 |
| 插入 CA、Kubernetes CSR signer | Helm、dubbod CA | 支持 |
| gRPC 外部授权 provider | xDS 契约 | 契约已定义，执行面待补 |
| 非 HTTP 的 JWT 声明授权 | — | 不适用；JWT 是 HTTP 请求身份 |

Ingress 的 `remoteIpBlocks` 依赖正确的可信代理边界；错误配置转发头会扩大信任范围。
Kubernetes CSR 模式要求集群中已有 signer。CA 灾备、HSM/KMS 私钥托管和跨集群根证书
轮换属于部署环境运维能力，不由单个策略资源自动完成。

推荐上线顺序：

1. 建立 CA、证书轮换和 `PERMISSIVE` mTLS。
2. 以 AUDIT 或 `dryRun` 发布授权规则。
3. 启用 JWT、ALLOW/DENY 和外部授权。
4. 把工作负载切到 `STRICT`，再提升最低 TLS 版本。
5. 用正例、反例和绕过尝试持续验证，不只检查 CRD 已创建。
