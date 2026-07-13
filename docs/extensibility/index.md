# 可扩展性

Kdubbo 采用“声明式 API + 编译期接口”扩展控制面，不在运行时加载 Go 插件。用户通过 CRD 扩展服务模型，控制面将配置转换为统一的服务、端点和 xDS 数据。

## 扩展层次

- **服务来源**：实现服务注册表接口，可接入 Kubernetes、ServiceEntry 或其他注册中心。
- **配置 API**：新增 CRD，并生成 API、Kubernetes Client、Informer 和 Schema。
- **数据面能力**：通过 xDS 下发监听、路由、集群和端点；新增能力必须同时具备控制面转换与数据面支持。

## 扩展网格服务

`ServiceEntry` 定义服务，`WorkloadEntry` 定义不属于 Kubernetes Pod 的端点。两者通过同命名空间的标签选择器关联。

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

端点端口按 `WorkloadEntry.ports`、`ServiceEntry.targetPort`、`ServiceEntry.number` 的顺序取值。端点变化只触发增量 EDS 更新；服务定义变化才触发服务更新。

## 新增扩展类型

1. 在 `kdubbo/api` 定义 Proto 和 CRD。
2. 在 `kdubbo/client-go` 生成类型化客户端与 Informer。
3. 在控制面注册 Schema、事件处理器和转换逻辑。
4. 验证 CRD、增量更新和 `go test ./...`。

扩展应优先使用稳定、类型化的 API。任意 xDS Patch 和运行时动态插件不作为当前扩展机制。
