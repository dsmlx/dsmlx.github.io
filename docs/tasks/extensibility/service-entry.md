# 扩展网格服务

使用 `ServiceEntry` 定义服务，使用 `WorkloadEntry` 登记虚拟机或集群外端点。两者通过同命名空间的标签关联。

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
