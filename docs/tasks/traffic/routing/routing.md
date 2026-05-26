# 流量路由

> 目前属于设计完毕阶段，该任务需要使用示例，即将推出


## URI 路由

下面的规则把 `shop.com` 作为虚拟入口，根据 URI 前缀把请求转发到 `order` 或 `payment`。

```bash
kubectl apply -f - <<EOF
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: MeshService
metadata:
  name: shop-routing
  namespace: default
spec:
  hosts:
  - shop.com
  rules:
  - match:
    - uri:
        prefix: /order
    route:
    - service:
      - name: order
        host: order.default.svc.cluster.local
  - match:
    - uri:
        prefix: /payment
    route:
    - service:
      - name: payment
        host: payment.default.svc.cluster.local
EOF
```

`rules` 按顺序匹配。把精确规则放在前面，把更宽泛的规则放在后面，不写 `match` 的规则作为默认兜底。

## Header 路由

下面的规则把 `end-user: jason` 的请求路由到 `product` 的 `v1` 子集，其余流量按权重进入 `v2` 和 `v3`。

```bash
kubectl apply -f - <<EOF
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: MeshService
metadata:
  name: product-routing
  namespace: default
spec:
  hosts:
  - product
  rules:
  - match:
    - headers:
        end-user:
          exact: jason
    route:
    - service:
      - name: product-v1
        host: product.default.svc.cluster.local
        labels:
          version: v1
    routes:
    - service:
      - name: product-v2
        host: product.default.svc.cluster.local
        labels:
          version: v2
        weight: 20
      - name: product-v3
        host: product.default.svc.cluster.local
        labels:
          version: v3
        weight: 80
EOF
```

## 查看资源

```bash
kubectl get meshservice -n default
kubectl get meshservice product-routing -n default -o yaml
```

## 清理

```bash
kubectl delete meshservice shop-routing -n default --ignore-not-found=true
kubectl delete meshservice product-routing -n default --ignore-not-found=true
```
