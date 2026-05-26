Dubbo 的流量管理以 `MeshService` 资源对象为核心。`MeshService` 是网格内的虚拟服务规则，用来把客户端访问的一个或多个 `hosts` 映射到真实服务、服务版本或按权重拆分的目标。

`MeshService` 规则会被控制面转换为 xDS 路由，xDS 是数据面从控制面获取监听、路由、集群和端点配置的协议。它可以处理 HTTP/1.1、HTTP/2 和 gRPC 流量，常见用途包括 URI 路由、Header 路由、金丝雀发布、版本灰度和 mTLS 目标策略。

## 网格服务

### hosts 字段

`hosts` 字段指定客户端访问的虚拟目标，可以是用户直接设定的域名，也可以是 Kubernetes Service 的短名或 FQDN。控制面会把短名解析为完全限定域名（FQDN），例如 `product` 会在 `default` 命名空间内解析为 `product.default.svc.cluster.local`。

`hosts` 字段不必是 Dubbo 服务注册表中的真实条目，它只是虚拟的目标地址，因此也可以用来定义不在网格内部的虚拟主机。

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: MeshService
metadata:
  name: foo-service-routing
  namespace: default
spec:
  hosts:
    - foo.default.svc.cluster.local
  rules:
  - routes:
    - service:
      - name: foo
        host: foo.default.svc.cluster.local
        port:
          number: 9080
```

### rules 字段

`rules` 字段包含有序的路由规则。每条规则可以有 0 个或多个 `match` 条件，并把命中的请求转发到 `route` 或 `routes` 中声明的目标服务。

规则顺序就是数据面匹配顺序，推荐按“精确条件 → 宽泛条件 → 默认兜底”排列。精确规则用于特定 URI、Header 或用户流量；宽泛规则用于前缀路径或服务大类；不写 `match` 的规则就是默认兜底规则。

```yaml
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
```

上面的规则让用户访问 `http://shop.com/order` 时进入 `order` 服务，访问 `http://shop.com/payment` 时进入 `payment` 服务。`shop.com` 是虚拟服务入口，真实后端仍然是独立的 Kubernetes Service。

### match 字段

`match` 字段描述请求匹配条件。多个 `match` 条目是 OR 关系，同一个 `match` 条目内的字段是 AND 关系。

支持的常用条件：

- `uri`：匹配请求路径，支持 `exact`、`prefix`、`regex`。
- `headers`：匹配请求头，常用于用户、租户、实验分组。
- `method`：匹配 HTTP 方法。
- `queryParams`：匹配查询参数。
- `port`：匹配目标端口。
- `host`：匹配请求主机名。

```yaml
rules:
- match:
  - headers:
      end-user:
        exact: jason
  route:
  - service:
    - name: product
      host: product.default.svc.cluster.local
      labels:
        version: v2
```

### route 和 routes 字段

`route` 表示命中当前 `match` 后的主要转发目标，`routes` 表示后续兜底或按权重拆分的目标。两者的元素结构一致，都是一个或多个 `service` 目标。

当一个目标设置了 `labels`，控制面会生成对应的子集路由；当多个目标设置 `weight`，数据面按权重分配流量。

```yaml
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
```

这个规则把 `end-user: jason` 的请求先路由到 `v1`。没有命中特定用户规则的流量进入兜底目标，并按 `v2=20`、`v3=80` 分配。

### trafficPolicy 字段

`trafficPolicy` 字段描述目标流量策略。当前常用策略是 TLS，例如把上游连接设置为 Dubbo 自动管理证书的 mTLS。

<details>
  <summary>服务级别</summary>
```yaml
trafficPolicy:
  tls:
    mode: DUBBO_MUTUAL
```
</details>
<details>
  <summary>全局级别</summary>
```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: MeshService
metadata:
  name: nginx-routing
  namespace: app
spec:
  hosts:
  - nginx.app.svc.cluster.local
  trafficPolicy:
    tls:
      mode: DUBBO_MUTUAL
```
</details>


### 负载均衡
通过同一条规则中的多个 `service` 和 `weight` 完成基础流量分配。权重是相对比例，不要求总和等于 100。

### 超时
敬请期待

### 重试
敬请期待

### 限流
敬请期待

### 熔断器
敬请期待

### 故障注入
敬请期待

## 网关

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: order-gateway-route
spec:
  parentRefs:
    - kind: Gateway
      name: main-gateway
  rules:
    - matches:
        - path:
            type: PathPrefix
            value: /api/v1
      filters:
        - type: RequestHeaderModifier
          requestHeaderModifier:
            add:
              - name: x-traffic-class
                value: api-v1
      backendRefs:
        - name: order-service
          port: 8080
```

