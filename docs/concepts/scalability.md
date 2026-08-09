# 按需激活与缩容到零

按需激活让 HTTP 或 unary gRPC 服务空闲时缩到零；第一个请求由 dxgate 扣住，等 KEDA 扩容和 EDS 收敛后再放行，而不是返回 503。

## 南北向与东西向

南北向请求已经经过托管 Gateway，dxgate 可直接扣住冷请求。

东西向 proxyless 调用平时由调用方直接连接 EDS 端点。目标缩到零时，`dubbod` 不下发空 EDS，而是临时把端点切到同命名空间专用 Activator Gateway `dxgate-gateway`。Activator 根据原始 Host 扣住请求；后端 Ready 后 EDS 恢复真实端点，新请求重新走直连热路径。

因此 HTTP 和 unary gRPC 的入口及网格内调用都可以缩到零；流式 RPC、长连接和无法重放的请求仍应保持至少一个副本。

## 三方分工

| 组件 | 负责 | 不负责 |
| --- | --- | --- |
| `ServiceActivationPolicy` | 声明目标、协议、等待时间、最大 pending、失败策略 | 不写副本数 |
| KEDA `ScaledObject` | 查询 pending，作为副本数的唯一写入者 | 不扣请求 |
| dxgate Activator | 扣请求、上报 pending、等待端点并放行 | 不扩容工作负载 |

## 一次冷启动

1. KEDA 把服务缩到零。
2. `dubbod` 将冷 EDS 指向 `dxgate-gateway`。
3. 请求到达 Activator；它按策略上限扣住并上报 pending。
4. KEDA external scaler 从 `dubbod-activation` 查询 pending，把副本从 0 扩到 1。
5. Pod Ready，`dubbod` 恢复真实 EDS。
6. Activator 放行被扣请求；后续请求走热路径直连后端。

## HA 与 mTLS

托管 Activator 与 dubbod 默认支持多副本和 PodDisruptionBudget。网关向 headless `dubbod-activation-replicas` 的每个控制面副本上报，KEDA 从负载均衡的 `dubbod-activation` 查询，因此任一副本都看到相同 pending。

东西向冷/热 EDS 切换时 CDS 不切换。`backendServiceAccounts` 必须列出后端身份；控制面同时发布后端与 Activator 的 SAN，避免切换期间出现证书校验窗口。

## 成本与边界

- 第一个请求承担 KEDA 轮询、调度、拉镜像、进程启动、证书和首次 xDS 收敛时间。
- `requestTimeout` 要大于实测冷启动时间，并小于调用方 deadline。
- `maxPendingRequests` 限制单目标占用；网关全局 backlog 还有独立上限。
- 流式请求、长连接、有状态服务和冷启动过长的服务不适合缩到零。
- 监控 `dxgate_activation_requests_held`、策略 `ScalerReady` / `ActivatorReady`、KEDA/HPA 条件和请求错误率。

配置与验证见[按需激活任务](../tasks/scalability/activation.md)。
