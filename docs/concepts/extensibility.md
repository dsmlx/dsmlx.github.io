> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

Dubbo 采用 声明式 API + 编译期接口扩展控制面，不在运行时加载 Go 插件。

当前提供 `ServiceEntry` 和 `WorkloadEntry`：前者定义服务，后者定义 Kubernetes Pod 之外的端点。端点变化只触发增量 EDS 更新。

虚拟机接入、健康状态、地域和权重配置见[虚拟机接入任务](../tasks/extensibility/virtual-machines.md)。

## 扩展如何生效

`ServiceEntry` 和 `WorkloadEntry` 由控制器监听，经服务注册表转换为统一的服务与端点，再通过 xDS 更新数据面。

`WorkloadEntry` 只影响标签匹配且位于同一命名空间的 `ServiceEntry`，无关端点不会触发推送。

当 `ServiceEntry` 与 Kubernetes Service 使用同一主机名时，以 Kubernetes Service 为主体，合并 `ServiceEntry` 声明的服务身份信息，避免生成重复服务。
