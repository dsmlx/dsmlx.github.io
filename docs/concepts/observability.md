> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

Dubbo 当前的可观测性以指标为主。控制面暴露运行状态和 xDS 指标；Inherent gRPC 运行时生成标准 RPC 指标；托管 Gateway 的 dxgate 数据面暴露请求、失败、并发和延迟指标。

## 指标

dubbod 通过 `/metrics` 暴露控制面指标。Inherent 标准指标和标签见[应用标准指标](../reference/application-standard-metrics.md)。托管 Gateway 创建的 dxgate Pod 带有 Prometheus 抓取注解，Prometheus 可以通过 Kubernetes Pod discovery 自动采集 `/metrics`。dxgate HTTP 指标使用稳定标签 `namespace`、`gateway`、`route`、`cluster`、`method`、`status_code`。

## 同步状态

控制平面在监控端口（默认 8080）上提供 debug 端点，用于回答 "我的配置到底推没推到数据面"：

- `/debug/syncz`：每个已连接 proxy 的 xDS 同步状态（各资源类型的 nonce 已发送/已确认、资源数量、最近错误）；
- `/debug/configz`：控制面当前加载的配置资源清单；
- `/debug/registryz`：服务注册表内容。

`dubboctl proxy-status` 封装了 `/debug/syncz`，按 proxy 输出 CDS/LDS/EDS/RDS 的 `SYNCED`/`STALE`/`ERROR` 状态表。
