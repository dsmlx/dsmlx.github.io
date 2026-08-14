# 运维与排障

按“工作负载、配置、xDS”顺序检查网格。日常操作优先使用 `dubboctl`，需要原始控制面数据时再访问 dubbod Debug 端点。

## 查看工作负载 {#workloads}

```bash
# 查看全部已注入的 Pod
dubboctl get pods

# 只查看指定命名空间
dubboctl get pods -n backend
```

输出包含就绪状态、重启次数、节点和注入模板，可先定位未就绪、频繁重启或节点分布异常的工作负载。

## 校验安装配置 {#validate}

```bash
dubboctl validate -f dubbo-operator.yaml
```

`validate` 当前校验 `install.dubbo.apache.org/v1alpha1` 的 `DubboOperator` 安装配置。网格策略提交后的引用关系和实际生效条件，应使用 `dubboctl analyze` 检查。

## 分析集群配置 {#analyze}

```bash
# 默认命名空间
dubboctl analyze

# 指定命名空间或全部命名空间
dubboctl analyze -n backend
dubboctl analyze -A
```

分析范围包括：

- `HTTPRoute` 和 `CircuitBreakerPolicy` 引用的 Service 或端口是否存在；
- 安全策略 selector 是否匹配 Pod，JWT 是否真正强制，mTLS 是否仍允许明文；
- dubbod 与 dxgate 是否具备多副本、PodDisruptionBudget 和跨节点分布。

出现 `Error` 时命令返回非零退出码；`Warning` 和 `Info` 需要结合发布计划处理。

## 检查 xDS 同步 {#xds-status}

```bash
dubboctl proxy-status
```

命令通过 Kubernetes API 汇总所有运行中 dubbod 实例的 CDS、LDS、EDS 和 RDS 状态，无需端口转发。

| 状态 | 含义 |
| --- | --- |
| `SYNCED` | 数据面已确认最近一次推送 |
| `STALE` | 已推送但尚未确认；持续出现时检查控制面和数据面日志 |
| `ERROR` | 最近一次推送失败；查看 `/debug/syncz` 的 `last_error` |
| `NOT SENT` / `NOT WATCHED` | 尚未推送，或数据面未订阅该资源类型 |

## 深入排障 {#debug}

常规命令无法定位问题时，临时访问 dubbod 监控端口：

```bash
kubectl -n dubbo-system port-forward deploy/dubbod 8080:8080
curl -s http://localhost:8080/debug | jq
```

| 端点 | 内容 |
| --- | --- |
| `/debug/syncz` | 已连接数据面的 xDS 同步状态和最近错误 |
| `/debug/configz` | 控制面已加载的配置资源 |
| `/debug/registryz` | 服务注册表 |
| `/debug/endpointz` | xDS 发布的端点、健康状态和节点位置 |

Prometheus 指标的部署和查询方式见[指标](../tasks/observability/metrics/metrics.md)。
