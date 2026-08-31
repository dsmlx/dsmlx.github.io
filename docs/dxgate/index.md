# dxgate 是什么

dxgate 是 Dubbo Gateway API 流量的委托网关，也是 Dubbo 服务网格的外部数据面代理。

它以 xDS 客户端的身份从控制面 `dubbod` 获取普通 HTTP、LLM、MCP 与 A2A 的完整运行配置。

## 它解决什么问题

当网格接入 AI 工作负载时，通常会出现两套边缘：一套给传统业务服务，一套给模型服务与智能体服务。两套边缘意味着两份证书、两份限流、两份可观测性口径。dxgate 把它们收敛到同一个数据面：

- 传统应用与 AI 智能体接入同一个网关进程；
- 普通应用后端使用 Kubernetes `Service`，AI 后端统一使用 `DxgateService`，两者都由 `dubbod` 编译并通过 xDS 下发；
- 认证、限流、重试、超时、请求头改写一次声明，对两类流量同时生效。

## 协议支持

| 流量类型 | 匹配依据 | 说明 |
| --- | --- | --- |
| HTTP | host、path、header | 加权集群分流，`prefix` 与 `exact` 两种路径匹配 |
| gRPC / Dubbo Triple | 按 `content-type` 自动识别 | 端到端 HTTP/2 透传，支持流式 body 与 trailer 传递 |
| LLM | `/v1/*` 路径与请求体中的 `model` | OpenAI 兼容报文，SSE 流式响应原样透传 |
| MCP | `mcp-session-id` 与工具名 | 会话绑定后端，`tools/list` 跨多个后端聚合 |
| A2A | Agent Card 与 A2A 端点 | 按 `agent` 名转发 |

## 与服务网格的关系

dxgate 位于集群边缘，只处理进出集群的那一跳；集群内部的服务间调用仍由网格自身完成。边缘与网格内部共用同一套声明模型，但故障域彼此隔离——网关重载配置不会影响已建立的网格内连接。

接下来可以看[网关架构](architecture.md)与[统一 DxgateService API](service.md)。四类后端分别见：[普通 Kubernetes Service](http-service.md)、[LLM 路由](llm.md)、[MCP 路由](mcp.md)、[A2A 转发](a2a.md)。订阅与 API 计费对接见[成本控制](cost-control.md)。
