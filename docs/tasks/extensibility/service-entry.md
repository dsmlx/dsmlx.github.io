# 扩展网格服务

使用 `ServiceEntry` 定义服务，使用 `WorkloadEntry` 登记虚拟机或集群外端点。两者通过同命名空间的标签关联。

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

端点端口按 `WorkloadEntry.ports`、`ServiceEntry.targetPort`、`ServiceEntry.number` 的顺序取值。

## 生效规则

| 变更 | 控制面行为 |
| --- | --- |
| 新增或删除 `ServiceEntry` | 更新服务并推送 EDS |
| 修改匹配的 `WorkloadEntry` | 仅推送增量 EDS |
| 修改不匹配的 `WorkloadEntry` | 不推送 |

服务主机、地址、端口、协议、选择器和 `exportTo` 会在写入时校验；无效配置不会进入服务发现链路。
