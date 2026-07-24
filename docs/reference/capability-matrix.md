> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

本章介绍某个治理能力目前能不能用、由哪个 API 配置、依赖数据面的什么支持。

Proxyless 架构下，策略在应用进程内执行，因此每项能力同时受两端约束：

1. **控制面**：dubbod 是否已将该配置 API 翻译为 [xDS](https://github.com/kdubbo/xds-api) wire 协议资源；
2. **数据面**：应用侧 xDS 客户端是否实现了对应的 filter / 路由 / LB 语义。

新增能力时应先确认已有对应字段，再实现控制面翻译与数据面执行。

## 流量管理

| 能力 | 配置 API       | 下发形式 | 状态 |
|---|--------------|---|---|
| 服务发现（K8s Service） | Service + EndpointSlice | CDS/EDS | 支持 |
| 网格外部服务 / 手工注册 | ServiceEntry | CDS/EDS（DNS/STATIC resolution） | 支持 |
| 虚拟机 / 裸机工作负载 | ServiceEntry + WorkloadEntry | 增量 EDS（地址、端口、健康状态、拓扑） | 支持 |
| 路由匹配 | HTTPRoute    | RDS RouteMatch | 支持 |
| 加权流量转移（金丝雀） | HTTPRoute backendRefs weight | RDS WeightedCluster | 支持 |
| 请求超时 | HTTPRoute    | RDS RouteAction.Timeout | 支持 |
| 子集路由 | DestinationRule subsets | CDS 子集 cluster | 支持 |
| 熔断 | CircuitBreakerPolicy | 入站侧下发（grpc-inbound） | 支持 |
| Ingress / Egress 网关 | Gateway API Gateway + HTTPRoute | 网关 Deployment 由控制面托管 | 支持 |
| 重试策略 | —            | — | 未支持 |
| 故障注入 | —            | — | 未支持 |
| EDS 地域分组与端点权重 | WorkloadEntry | EDS LocalityLbEndpoints + endpoint weight | 发布；就近选择取决于数据面 LB |

## 安全

| 能力 | 配置 API | 下发形式 | 状态 |
|---|---|---|---|
| 工作负载身份（SPIFFE 证书） | 自动（内置 CA） | 证书签发 + xDS mTLS 引导 | 支持 |
| mTLS（对端认证） | PeerAuthentication | 上游 TLS context + 入站校验 | 支持 |
| 后端 TLS | Gateway API BackendTLSPolicy | CDS UpstreamTlsContext | 支持 |
| JWT 认证 | RequestAuthentication | LDS `jwt_authn` HTTP filter | 支持 |
| 授权（ALLOW/DENY，requestPrincipals + when 条件） | AuthorizationPolicy | LDS `rbac` HTTP filter（DENY 优先） | 支持 |
| 基于源工作负载身份的授权（source principals/namespaces） | AuthorizationPolicy | — | 部分：source 维度当前仅编译 requestPrincipals |

## 可观测性

| 能力 | 配置 API | 说明         | 状态 |
|---|---|------------|---|
| 控制面指标 | — | :8080/metrics | 支持 |
| 网格指标 / 链路追踪 / 日志 | Telemetry + observability profile | 任务 → 可观测性  | 支持 |
| 内嵌 GUI | — | overview / logs / metrics 视图 | 支持 |

## 多集群

| 能力 | 状态 |
|---|---|
| 远端集群凭据发现（secret controller） | 支持 |
| east-west gateway 打通 | 支持（需显式开启） |
| 跨集群故障域感知路由 | 未支持 |