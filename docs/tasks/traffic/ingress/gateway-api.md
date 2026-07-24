> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

> 目前属于设计完毕阶段，该任务需要使用示例，即将推出

Ingress 是从集群外进入网格内服务的入口流量治理。本示例演示如何通过 [Gateway API](https://gateway-api.sigs.k8s.io/) 暴露 `httpbin` 服务。

当前入口模型使用共享的外部网关数据面。业务服务只需要创建 `HTTPRoute`，并把 `parentRefs.name` 指向外部网关数据面；`dubbod` 会根据 Gateway API 资源托管固定的外部网关数据面。

## 先决条件

确认已经安装 CRD：

```bash
kubectl get crd gateways.gateway.networking.k8s.io httproutes.gateway.networking.k8s.io gatewayclasses.gateway.networking.k8s.io
```

确认控制面已经启用 Gateway API。

## 部署示例

```bash
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```

## 查看资源

```bash
kubectl get gatewayclass dubbo
kubectl get gateway dxgate-gateway
kubectl get httproute httpbin
kubectl get deploy,svc -l app.kubernetes.io/name=dxgate
```

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

新增业务服务时，继续创建资源并指向同一个网关数据面：除非需要独立入口实例，不要为每个业务服务创建新的 Gateway。


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

## 清理

```bash
kubectl delete -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```
