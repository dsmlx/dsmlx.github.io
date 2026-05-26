# Kubernetes Gateway API

> 目前属于设计完毕阶段，该任务需要使用示例，即将推出


本示例演示如何通过 [Gateway API](https://gateway-api.sigs.k8s.io/) 暴露 `httpbin` 服务。

当前入口模型使用共享的 `dxgate-gateway`。业务服务只需要创建 `HTTPRoute`，并把 `parentRefs.name` 指向 `dxgate-gateway`；`dubbod` 会根据 Gateway API 资源托管固定的 dxgate 数据面。

## 先决条件

确认集群已经安装 Gateway API CRD：

```bash
kubectl get crd gateways.gateway.networking.k8s.io httproutes.gateway.networking.k8s.io gatewayclasses.gateway.networking.k8s.io >/dev/null 2>&1 || \
  kubectl kustomize "github.com/kubernetes-sigs/gateway-api/config/crd?ref=v1.4.1" | kubectl apply -f -
```

确认控制面已经启用 Gateway API。默认情况下，`dubbod` 会启用 Gateway API 控制器、状态控制器、GatewayClass 控制器和 dxgate 部署控制器。若集群无法拉取默认镜像，请在安装控制面时把 `DUBBO_DXGATE_IMAGE` 配置为可访问的 dxgate 镜像。

## 部署示例

```bash
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```

该示例会创建：

- `ServiceAccount/httpbin`
- `Service/httpbin`
- `Deployment/httpbin`
- `Gateway/dxgate-gateway`
- `HTTPRoute/httpbin`

其中 `HTTPRoute/httpbin` 通过 `parentRefs.name: dxgate-gateway` 绑定到共享入口。

## 查看资源

```bash
kubectl get gatewayclass dubbo
kubectl get gateway dxgate-gateway
kubectl get httproute httpbin
kubectl get deploy,svc -l app.kubernetes.io/name=dxgate
```

`dxgate-gateway` 的 Service 是外部入口，Deployment 是 `dubbod` 托管的数据面。

## 访问服务

如果集群支持 `LoadBalancer`，直接查看入口地址：

```bash
kubectl get svc dxgate-gateway -o wide
```

本地验证可以使用端口转发：

```bash
kubectl port-forward svc/dxgate-gateway 18080:80
curl -s http://127.0.0.1:18080/get
```

如需查看 dxgate 收到的 xDS 配置，可以转发管理端口：

```bash
kubectl port-forward deploy/dxgate-gateway 16021:26021
curl -s http://127.0.0.1:16021/debug/config
```

## 添加更多路由

新增业务服务时，继续创建 `HTTPRoute` 并指向同一个 `dxgate-gateway`：

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: product
spec:
  parentRefs:
  - name: dxgate-gateway
    sectionName: http
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /product
    backendRefs:
    - name: product
      port: 8000
```

除非需要独立入口实例，不要为每个业务服务创建新的 Gateway。

## 清理

```bash
kubectl delete -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml --ignore-not-found=true
```
