# 可扩展性

Kdubbo 采用“声明式 API + 编译期接口”扩展控制面，不在运行时加载 Go 插件。

## 扩展层次

- **服务来源**：通过服务注册表接口接入 Kubernetes、ServiceEntry 或其他注册中心。
- **配置 API**：通过 CRD 扩展服务和策略模型，并生成类型化客户端与 Informer。
- **数据面能力**：控制面将配置转换为服务、端点和 xDS；新能力需要控制面与数据面同时支持。

当前提供 `ServiceEntry` 和 `WorkloadEntry`：前者定义服务，后者定义 Kubernetes Pod 之外的端点。端点变化只触发增量 EDS 更新。

新增扩展类型时，依次修改 `kdubbo/api`、`kdubbo/client-go` 和控制面 Schema/转换逻辑，并补齐 CRD 与测试。

任意 xDS Patch 和运行时动态插件不属于当前扩展机制。
