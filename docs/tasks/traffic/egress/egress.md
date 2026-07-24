> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

> 本任务使用 Gateway API 流量面。

Egress 是网格内工作负载访问集群外服务的出站流量治理。当前实现使用显式治理：业务只访问声明过的 Kubernetes `ExternalName` Service 或内部 egress Gateway，不透明捕获任意出站连接。

## 声明外部服务

用 `ExternalName` Service 把集群内名字映射到真实外部域名：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Service
metadata:
  name: httpbin-egress
  namespace: default
spec:
  type: ExternalName
  externalName: httpbin.org
  ports:
  - name: https
    port: 443
EOF
```

## 部署 egress Gateway

创建一个只在集群内访问的 Gateway。`gateway.dubbo.apache.org/service-type: ClusterIP` 表示 `dubbod` 托管的 dxgate Service 不暴露到集群外：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: egress-gateway
  namespace: default
  annotations:
    gateway.dubbo.apache.org/service-type: ClusterIP
spec:
  gatewayClassName: dubbo
  listeners:
  - name: http
    protocol: HTTP
    port: 80
EOF
```

等待 dxgate 就绪：

```bash
kubectl -n default rollout status deploy/dxgate-gateway
```

## 配置 HTTPS 出口

`HTTPRoute` 挂到 egress Gateway，后端指向 `ExternalName` Service。`BackendTLSPolicy` 声明 dxgate 到外部服务使用系统根证书校验，并用 `validation.hostname` 作为 SNI：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: httpbin-egress
  namespace: default
spec:
  parentRefs:
  - name: egress-gateway
    sectionName: http
  hostnames:
  - httpbin-egress.default.svc.cluster.local
  rules:
  - backendRefs:
    - name: httpbin-egress
      port: 443
---
apiVersion: gateway.networking.k8s.io/v1
kind: BackendTLSPolicy
metadata:
  name: httpbin-egress-tls
  namespace: default
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: httpbin-egress
  validation:
    wellKnownCACertificates: System
    hostname: httpbin.org
EOF
```

## 验证

本地验证可以端口转发到内部 egress Gateway：

```bash
kubectl -n default port-forward svc/dxgate-gateway 18080:80
curl -s -H 'Host: httpbin-egress.default.svc.cluster.local' http://127.0.0.1:18080/get
```

预期返回 `httpbin.org` 的 JSON 响应。

也可以查看 dxgate 收到的后端配置：

```bash
kubectl -n default port-forward deploy/dxgate-gateway 16021:26021
curl -s http://127.0.0.1:16021/debug/clusters | jq '.[] | select(.name | contains("httpbin-egress"))'
```

预期后端地址是 `httpbin.org`，TLS mode 是 `simple`。

## 让业务只能走 egress Gateway

当前不是透明出站拦截。如果要阻断业务绕过 egress Gateway 直接访问外部网络，需要配套 `NetworkPolicy`，只允许 DNS 和 egress Gateway 出站：

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: only-egress-gateway
  namespace: default
spec:
  podSelector: {}
  policyTypes:
  - Egress
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
  - to:
    - podSelector:
        matchLabels:
          app.kubernetes.io/name: dxgate
    ports:
    - protocol: TCP
      port: 80
```

## 清理

```bash
kubectl -n default delete httproute httpbin-egress
kubectl -n default delete backendtlspolicy httpbin-egress-tls
kubectl -n default delete gateway egress-gateway
kubectl -n default delete service httpbin-egress
```
