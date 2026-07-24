> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

本章介绍覆盖网格日常运维与排障的工具链：配置校验、配置分析、同步状态检查和观测组件访问。

## 校验

`dubboctl validate` 在资源提交到集群前做离线校验，使用与校验 webhook 相同的规则：

```bash
dubboctl validate -f authorization-policy.yaml
```

覆盖的资源类型：`AuthorizationPolicy`、`PeerAuthentication`、`RequestAuthentication`、`CircuitBreakerPolicy`。典型会被拦截的错误包括：

- selector 设置了但 `matchLabels` 为空，或标签不合法；
- DENY 策略没有任何 `rules`（空 DENY 不匹配任何请求，属于无效配置）；
- JWT 规则缺 `issuer`、`jwksUri` 不是合法的 `http(s)` URL、`jwksUri` 与 `jwks` 同时设置；
- `CircuitBreakerPolicy` 的 `targetRefs` 为空或指向非 `Service` 目标、数值越界（如 `maxEjectionPercent` 超过 100）；
- 端口级 mTLS 没有配 workload selector。

集群侧的校验 webhook 使用同一套函数，直接 `kubectl apply` 非法资源同样会被拒绝。

## 分析

`dubboctl analyze` 检查集群里“语法合法但不会按预期生效”的配置：

```bash
# 分析 default namespace
dubboctl analyze

# 分析指定 namespace / 全部 namespace
dubboctl analyze -n backend
dubboctl analyze -A
```

当前的分析器：

| 级别 | 检查项 |
| --- | --- |
| Error | `HTTPRoute` 的 backendRef 指向不存在的 Service 或 Service 上不存在的端口 |
| Error | `CircuitBreakerPolicy` 的 targetRef 指向不存在的 Service |
| Warning | `AuthorizationPolicy` / `RequestAuthentication` 的 selector 匹配不到任何 Pod |
| Warning | 配置了 JWT 校验但同 namespace 没有任何限制 `requestPrincipals` 的授权策略（JWT 实际不强制） |
| Info | `PeerAuthentication` 长期处于 `PERMISSIVE`（仍接受明文连接） |

存在 Error 级别问题时命令以非零退出码结束，可直接接入 CI。

## 同步状态检查

`dubboctl proxy-status` 显示每个已连接 proxy 对 CDS/LDS/EDS/RDS 的确认状态：

```bash
$ dubboctl proxy-status
NAME                          CLUSTER          CDS       LDS       EDS       RDS
backend-6d5f9c7b8-x2kfj.demo  Kubernetes       SYNCED    SYNCED    SYNCED    SYNCED
frontend-77b4c56d9-q8wzn.demo Kubernetes       SYNCED    SYNCED    STALE     SYNCED
```

- `SYNCED`：proxy 已确认 dubbod 最近一次推送；
- `STALE`：dubbod 已推送但 proxy 尚未确认，持续处于该状态说明推送或数据面异常；
- `NOT SENT`：dubbod 还没有向该 proxy 推送过此类型资源；
- `ERROR`：最近一次推送出错，详细信息见 `/debug/syncz` 输出的 `last_error`。

命令通过 Kubernetes API 代理访问 dubbod 监控端口，不需要额外的端口转发。

## Debug

dubbod 监控端口（默认 8080，`--httpAddr` 控制）提供以下端点：

| 端点 | 内容 |
| --- | --- |
| `/debug` | 可用 debug 端点索引 |
| `/debug/syncz` | 每个已连接 proxy 的 xDS 同步状态（nonce、资源数、最近错误） |
| `/debug/configz` | 控制面当前加载的配置资源清单 |
| `/debug/registryz` | 服务注册表内容 |
| `/metrics` | Prometheus 控制面指标 |
| `/version` | 构建版本信息 |

临时访问方式：

```bash
kubectl -n dubbo-system port-forward deploy/dubbod 8080:8080
curl -s localhost:8080/debug/syncz | jq
```


## 控制面调优

| 环境变量 | 默认值 | 说明 |
| --- | --- | --- |
| `DUBBO_DEFAULT_LB_POLICY` | `ROUND_ROBIN` | 生成集群的默认负载均衡策略，可选 `LEAST_REQUEST`、`RING_HASH`、`RANDOM` |
| `DUBBO_ENABLE_XDS_CACHE` | `true` | xDS 响应缓存总开关 |
| `DUBBO_ENABLE_CDS_CACHE` | `true` | CDS 响应缓存 |
| `DUBBO_ENABLE_RDS_CACHE` | `true` | RDS 响应缓存 |
