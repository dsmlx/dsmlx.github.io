> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

Dubbod 可以把虚拟机、裸机或其他非 Kubernetes 工作负载登记为网格端点，再由同命名空间的 `ServiceEntry` 提供稳定服务名。控制面监听资源变化并通过增量 EDS 更新客户端，不负责创建或管理虚拟机。

同一个 `ServiceEntry` 可以选择多个 `WorkloadEntry`。端点端口依次取 `WorkloadEntry.ports[端口名]`、`ServiceEntry.targetPort`、`ServiceEntry.number`。

## 前提条件

1. 集群已安装 Kdubbo base 与 dubbod，且存在 `ServiceEntry`、`WorkloadEntry` CRD。
2. 网格客户端能够直接访问虚拟机地址，或已配置独立的网络转发路径。
3. 虚拟机服务正在监听声明的端口。
4. 如需 mTLS，虚拟机进程或其入站代理必须使用与网格兼容的工作负载证书。

`network` 只是随端点传播的网络标识，不会自动打通路由、防火墙或 NAT。

## 注册虚拟机

将下列内容保存为 `payment-vm.yaml`，把 `address` 替换为网格客户端可以访问的真实地址：

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: WorkloadEntry
metadata:
  name: payment-vm-01
  namespace: default
spec:
  address: 192.0.2.10
  ports:
    grpc: 50051
  labels:
    app: payment
    version: v1
  network: datacenter-1
  locality: us-east-1/zone-a/rack-1
  weight: 1
  serviceAccount: payment
---
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: ServiceEntry
metadata:
  name: payment
  namespace: default
spec:
  hosts:
    - payment.mesh.local
  location: MESH_INTERNAL
  resolution: STATIC
  ports:
    - name: grpc
      number: 50051
      protocol: GRPC
  workloadSelector:
    matchLabels:
      app: payment
```

应用并检查资源：

```bash
kubectl apply -f payment-vm.yaml
kubectl get serviceentry,workloadentry -n default
```

`workloadSelector` 只选择相同命名空间中标签匹配的 `WorkloadEntry`。修改无关工作负载不会触发该服务的 EDS 更新。

## 配置地域和权重

`locality` 使用 `region/zone/subzone` 格式，最多三段且不能包含空段。控制面会按地域生成 `LocalityLbEndpoints`：

- `region`：地域，例如 `us-east-1`；
- `zone`：可用区，例如 `zone-a`；
- `subzone`：机架或部署单元，例如 `rack-1`；
- `weight`：端点相对负载均衡权重，未设置或为 `0` 时按 `1` 处理。

同一地域的 locality 权重是其中端点权重之和。`network`、`locality` 和单端点权重也会保留在 EDS 元数据中，便于数据面与排障工具读取。

这保证控制面能够发布拓扑和权重，不代表所有数据面都会自动选择最近地域；是否执行就近路由取决于客户端采用的负载均衡策略。

## 发布健康状态

没有健康条件时，控制面为兼容现有配置把端点视为健康。Kdubbo 不从控制面主动探测虚拟机；虚拟机健康代理或外部监控应更新 `Ready` 或 `Healthy` 条件。

标记端点不可用：

```bash
kubectl patch workloadentry payment-vm-01 -n default \
  --subresource=status --type=merge \
  -p '{"status":{"conditions":[{"type":"Ready","status":"False","reason":"HealthCheckFailed"}]}}'
```

恢复端点：

```bash
kubectl patch workloadentry payment-vm-01 -n default \
  --subresource=status --type=merge \
  -p '{"status":{"conditions":[{"type":"Ready","status":"True","reason":"HealthCheckPassed"}]}}'
```

`True` 映射为 `HEALTHY`；`False`、`Unknown` 或其他非 `True` 值映射为 `UNHEALTHY`。状态变化会触发增量 EDS。

## 检查控制面发布结果

转发 dubbod 监控端口：

```bash
kubectl -n dubbo-system port-forward deploy/dubbod 18080:8080
```

检查服务是否进入注册表：

```bash
curl -s http://127.0.0.1:18080/debug/registryz \
  | jq '.[] | select(.hostname == "payment.mesh.local")'
```

检查实际发布的端点、健康度与拓扑：

```bash
curl -s http://127.0.0.1:18080/debug/endpointz \
  | jq '.[] | select(.hostname == "payment.mesh.local")'
```

预期可以看到 `address`、`port`、`health`、`network`、`locality`、`weight`、`serviceAccount` 和 `workload`。

## 更新和下线

修改虚拟机地址或端口后重新应用资源，控制面会发布新的 EDS：

```bash
kubectl patch workloadentry payment-vm-01 -n default --type=merge \
  -p '{"spec":{"address":"192.0.2.11","ports":{"grpc":50052}}}'
```

临时故障使用健康状态阻止客户端优先选择该端点。永久下线时删除 `WorkloadEntry`，确保端点从 EDS 中移除：

```bash
kubectl delete workloadentry payment-vm-01 -n default
```

## 不使用 Kubernetes 配置源

dubbod 也可以从配置目录读取同样的 `ServiceEntry` 和 `WorkloadEntry` YAML：

```bash
dubbod execute \
  --registries= \
  --configDir=/etc/dubbo/config
```

文件变化会触发端点热更新。该模式不提供 Kubernetes status 子资源，健康状态应通过替换或删除文件中的端点来表达。

## 当前边界

| 能力 | 状态 |
|---|---|
| VM 服务注册、发现和增量路由更新 | 支持 |
| 端口映射、标签选择、服务账号 | 支持 |
| 地域分组、端点权重、网络元数据 | 支持 |
| 外部健康代理发布状态 | 支持 |
| 控制面主动健康探测 | 不提供 |
| VM 自动安装、进程管理和网络打通 | 不提供 |
| VM 工作负载证书自动引导与轮换 | 需部署侧提供 |

不要把 `WorkloadEntry` 当作虚拟机生命周期控制器。它描述的是服务发现所需的期望端点状态。
