# 流量转移

> 目前属于设计完毕阶段，该任务需要使用示例，即将推出


## 部署

### 1. 创建命名空间

```bash
kubectl create ns app
kubectl label namespace app dubbo-injection=enabled
```

### 2. 部署服务

```bash
kubectl apply -f samples/app/deployment.yaml
```

将 63% 的流量分配到 v1，37% 的流量分配到 v2：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: MeshService
metadata:
  name: nginx-routing
  namespace: app
spec:
  hosts:
  - nginx.app.svc.cluster.local
  rules:
  - routes:
    - service:
      - name: v1
        host: nginx.app.svc.cluster.local
        labels:
          version: v1
        port:
          number: 80
        weight: 63
      - name: v2
        host: nginx.app.svc.cluster.local
        labels:
          version: v2
        port:
          number: 80
        weight: 37
EOF
```

这里没有写 `match`，因此该规则是默认兜底规则。`xclient` 使用逐请求选路，不再先算好固定数量再批量发送。
```bash
kubectl -n app exec deploy/nginx-consumer -- dubbod xclient 100 | sort | uniq -c
```

先在一个终端持续发请求；另一个终端里创建 `MeshService` 权重。同一个 `xclient` 进程会继续使用同一条 xDS stream，后续请求会按新权重切换。
```bash
kubectl -n app exec deploy/nginx-consumer -- dubbod xclient --request-interval 200ms 200
```

## 清理

```bash
kubectl -n app delete meshservice nginx-routing
kubectl delete -f samples/app/deployment.yaml
kubectl delete ns app
```
