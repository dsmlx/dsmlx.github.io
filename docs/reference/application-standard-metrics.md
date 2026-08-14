# 应用标准指标

应用标准指标由 Inherent gRPC 运行时在应用进程内生成，不依赖代理工作负载。Telemetry API 负责开启指标并定制作用域和标签，不负责定义指标本身。

## 指标类型

| 类型 | 语义 |
|---|---|
| `COUNTER` | 进程生命周期内严格递增；Prometheus 使用 `_total` 计数器。 |
| `DISTRIBUTION` | 把观测值写入固定区间；Prometheus 暴露 histogram 的 `_bucket`、`_sum`、`_count`。 |

## 标准指标

启用 `prometheus` provider 后，Client 和 Server 默认生成以下指标：

| 标准指标 | Prometheus 指标 | 类型 | 必须提供的原因 |
|---|---|---|---|
| `REQUEST_COUNT` | `dubbo_inherent_requests_total` | `COUNTER` | 表示吞吐量；结合状态标签计算成功率和错误率。 |
| `REQUEST_DURATION` | `dubbo_inherent_request_duration_seconds` | `DISTRIBUTION` | 表示端到端 RPC 延迟，用于分位数和 SLO。 |
| `REQUEST_SIZE` | `dubbo_inherent_request_size_bytes` | `DISTRIBUTION` | 发现大请求及其带来的序列化、内存和带宽压力。 |
| `RESPONSE_SIZE` | `dubbo_inherent_response_size_bytes` | `DISTRIBUTION` | 发现大响应及其带来的内存和带宽压力。 |

不单独提供错误计数：`REQUEST_COUNT` 按 `grpc_response_status` 分组后已经能准确计算错误率，重复指标只会增加存储和查询成本。

## 标准标签

四个标准指标使用相同标签：

| 标签 | 值 | 保留原因 |
|---|---|---|
| `reporter` | `client` 或 `server` | 区分观测侧，避免把两端计数误当成一次请求。 |
| `grpc_service` | gRPC service 全名 | 定位服务，同时避免使用 Pod 等高基数身份。 |
| `grpc_method` | gRPC method 名 | 定位具体操作。 |
| `grpc_response_status` | 标准 gRPC status code | 区分成功和失败并计算错误率。 |

Prometheus 发现阶段附加的 `namespace`、`pod`、`instance` 不属于应用标准标签。Telemetry `tags` 只允许对上述标准标签执行 `REMOVE`；未知标签会被拒绝。

配置方式见[指标任务](../tasks/observability/metrics/metrics.md)。
