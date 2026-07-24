> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

Dubbo 安全基础架构负责工作负载身份、传输加密、请求认证和访问控制。mTLS（Mutual TLS）表示客户端和服务端使用证书互相校验身份；JWT（JSON Web Token）用于在 HTTP 请求中携带最终用户身份。

## 对等认证

`PeerAuthentication` 描述服务端入站流量的 mTLS 模式。没有 `selector` 时，策略作用于当前 namespace；放在 root namespace `dubbo-system` 时，策略作用于整个网格。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: PeerAuthentication
metadata:
  name: default
  namespace: dubbo-system
spec:
  mtls:
    mode: STRICT
```

### mTLS 模式

- `PERMISSIVE`：同时接受明文和 mTLS 流量。服务端注入的 `grpc-inbound` 会接收 mTLS 流量并转发到本地业务端口，同时不打断已有明文流量。
- `STRICT`：只接受 mTLS 流量。没有客户端证书或未接入网格的明文请求会被拒绝。
- `DISABLE`：关闭入站 mTLS。

### 自动 mTLS

服务端入站 mTLS 由 `PeerAuthentication` 控制。客户端出站加密策略会继续向 Gateway API 策略模型收敛，不再通过旧的 Dubbo 专用流量资源配置。

全局自动 mTLS 使用 root namespace 策略；namespace 级别策略可以只影响某个 namespace，适合分阶段迁移。

## 身份

出站 mTLS 不仅校验证书链，还固定对端身份：控制面在生成出站集群 TLS 配置时，会把目标服务背后工作负载的 SPIFFE 身份（由 namespace 与 ServiceAccount 推导）写入 `match_subject_alt_names`。持有同一 CA 签发证书的其他工作负载即使证书有效，也无法冒充目标服务。

入站方向在传输层接受任何通过网格 CA 认证的身份，按调用方细分的访问限制交给 `AuthorizationPolicy` 表达。

## 请求认证

`RequestAuthentication` 描述入站请求中的 JWT 校验规则。匹配到工作负载后，数据面会校验请求里携带的 JWT；无效 JWT 会被拒绝。单独配置 `RequestAuthentication` 时，没有 JWT 的请求仍然可以通过，因为它只负责认证，不负责授权。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: RequestAuthentication
metadata:
  name: jwt-example
  namespace: foo
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  - issuer: testing@secure.dubbo.apache.org
    jwksUri: https://secure.dubbo.apache.org/jwt/samples/jwks.json
```

`jwksUri` 必须是 `http`/`https` URL；`jwksUri` 与内联 `jwks` 二选一，同时设置会被校验 webhook 拒绝。要强制“无 JWT 即拒绝”，需要配合一条带 `requestPrincipals` 的 ALLOW `AuthorizationPolicy`（见下节）；`dubboctl analyze` 会对“配置了 JWT 校验但没有授权策略兜底”的组合发出告警。

## 授权

`AuthorizationPolicy` 描述经过认证后的请求是否可以访问目标工作负载。`requestPrincipals` 使用 JWT 的 `iss/sub` 组成，例如 `testing@secure.dubbo.apache.org/testing@secure.dubbo.apache.org`；`when` 可以继续匹配 `request.auth.claims[groups]` 等 JWT 声明。

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: foo
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals:
        - testing@secure.dubbo.apache.org/testing@secure.dubbo.apache.org
    when:
    - key: request.auth.claims[groups]
      values:
      - group1
```
