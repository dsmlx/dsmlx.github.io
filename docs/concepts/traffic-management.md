> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

Dubbo 的流量管理统一以 [Gateway API](https://github.com/kubernetes-sigs/gateway-api) 作为标准规范。

集群入口（Ingress）流量直接使用 Gateway API 定义路由；网格内部的东西向流量则遵循 [GAMMA 计划](https://gateway-api.sigs.k8s.io/docs/mesh/gamma/)。

## 介绍
xDS 是数据面从控制面获取监听、路由、集群和端点配置的协议，所以像 HTTPRoute 会被控制面转换为 xDS 路由。它可以处理 HTTP/1.1、HTTP/2 和 gRPC 流量。

## 路由规则

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: product-routing
  namespace: default
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: product
    port: 9080
  rules:
  - matches:
    - path:
        type: PathPrefix
        value: /reviews
    backendRefs:
    - name: reviews
      port: 9080
```

## 匹配和权重

路由会按照 `rules` 顺序匹配。多个 `matches` 条目是 OR 关系，同一个 `matches` 条目内的字段是 AND 关系。不写 `matches` 的规则是默认兜底规则。

路由权重版本灰度使用标准 `backendRefs`。Gateway API 的后端引用指向服务，因此版本流量应为 `reviews-v1`、`reviews-v2` 这样的服务版本。

下面这个规则把 `end-user: jason` 的请求路由到 `reviews-v1`。没有命中特定用户规则的流量进入兜底目标，并按 `reviews-v2=20`、`reviews-v3=80` 分配。
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: reviews-routing
  namespace: default
spec:
  parentRefs:
  - group: ""
    kind: Service
    name: reviews
    port: 9080
  rules:
  - matches:
    - headers:
      - name: end-user
        value: jason
    backendRefs:
    - name: reviews-v1
      port: 9080
      weight: 100
  - backendRefs:
    - name: reviews-v2
      port: 9080
      weight: 20
    - name: reviews-v3
      port: 9080
      weight: 80
```

### 负载均衡
通过同一条规则中的多个 `backendRefs` 和 `weight` 完成基础流量分配。权重是相对比例，不要求总和等于 100。

端点级负载均衡策略由控制面统一下发，默认 `ROUND_ROBIN`。可通过 dubbod 的 `DUBBO_DEFAULT_LB_POLICY` 环境变量切换为 `LEAST_REQUEST`、`RING_HASH` 或 `RANDOM`，对所有生成的集群生效。

### 超时
使用 `HTTPRoute` 规则的 `timeouts.request` 字段设置请求超时，控制面会转换成 xDS 路由超时。详见[请求超时任务](../tasks/traffic/request-timeouts/request-timeouts.md)。

### 重试
敬请期待（xDS 传输协议尚未包含重试策略字段，路线图见下文能力边界）

### 限流
敬请期待

### 熔断器
熔断通过 `CircuitBreakerPolicy` 以 Gateway API policy attachment 模型附着到 `Service`，包含连接池限制（`maxConnections`、`http2MaxRequests` 等）和被动异常摘除（`outlierDetection`）两组参数，当前对托管网关（dxgate）流量生效。详见[熔断任务](../tasks/traffic/circuit-breaking/circuit-breaking.md)。

### 故障注入
敬请期待

### 能力边界

服务间（proxyless）路径的可配置能力受 xDS 传输协议约束：加权分流、路径/Header 匹配、请求超时、负载均衡策略与 mTLS/SAN 校验已支持；重试、连接池熔断、异常摘除、Header 改写与限流需要扩展 xDS 协议与数据面 SDK 支持，属于路线图项。`CircuitBreakerPolicy` 当前的生效范围是托管网关。

## 网关

Dubbo 的网关分为 Ingress 和 Egress。Ingress 处理集群外到网格内的入口流量；Egress 处理网格内工作负载访问集群外服务的出口流量。

### Ingress

Ingress 使用 Gateway 暴露入口，然后指向该 Gateway：

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

### Egress

Egress 使用 `ExternalName` 服务登记外部域名，内部 egress Gateway 统一承接出口请求，然后把出口请求转发到外部服务。

当前 egress 不是透明捕获任意出站；业务需要访问声明过的 `ExternalName` 服务或内部 egress Gateway。

```yaml
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
---
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
---
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
```