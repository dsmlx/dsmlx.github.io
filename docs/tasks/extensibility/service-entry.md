> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

使用 `ServiceEntry` 定义服务，使用 `WorkloadEntry` 登记虚拟机或集群外端点。两者通过同命名空间的标签关联。

如果要接入虚拟机并配置健康状态、地域、权重和运行时检查，请直接参阅[虚拟机接入](virtual-machines.md)。

`STATIC` 使用显式端点；`DNS` 和 `DNS_ROUND_ROBIN` 由域名生成端点；`NONE` 采用透传模式。

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: WorkloadEntry
metadata:
  name: payment-vm
  namespace: default
spec:
  address: 10.0.0.20
  ports:
    grpc: 50051
  labels:
    app: payment
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
    - payment.example.com
  addresses:
    - 240.0.0.20
  ports:
    - name: grpc
      number: 50051
      protocol: GRPC
  location: MESH_INTERNAL
  resolution: STATIC
  workloadSelector:
    matchLabels:
      app: payment
  exportTo:
    - "*"
```

应用配置后检查资源：

```bash
kubectl apply -f service-entry.yaml
kubectl get serviceentries,workloadentries
```

端点端口按 `WorkloadEntry.ports`、`ServiceEntry.targetPort`、`ServiceEntry.number` 的顺序取值。未设置 `weight` 时按 `1` 处理。

## 生效规则

| 变更 | 控制面行为 |
| --- | --- |
| 新增或删除 `ServiceEntry` | 更新服务并推送 EDS |
| 修改匹配的 `WorkloadEntry` | 仅推送增量 EDS |
| 修改 `Ready` 或 `Healthy` 状态 | 更新端点健康状态并推送增量 EDS |
| 修改不匹配的 `WorkloadEntry` | 不推送 |

服务主机、地址、端口、协议、选择器、地域、服务账号和 `exportTo` 会在写入时校验；无效配置不会进入服务发现链路。
