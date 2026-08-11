Dubbo 安全基础架构负责工作负载身份、传输加密、请求认证和访问控制。mTLS（Mutual TLS）表示客户端和服务端使用证书互相校验身份；JWT（JSON Web Token）用于在 HTTP 请求中携带最终用户身份。

## 执行链路

安全能力按数据面实际职责拆分，不要求所有流量经过同一套过滤器：

- `dubbod` 内置 CA 为接入网格的工作负载签发短期证书，持续轮换证书和根证书，并通过 bootstrap/SDS 配置交付给数据面。私钥只写入工作负载 Secret，不进入 xDS 运行时配置。
- `dxproxy` 保护东西向 Inherent gRPC 入站流量：执行 `PeerAuthentication`，从已验证客户端证书的 URI SAN 提取 SPIFFE 身份，再执行基于 `principals` 的 `AuthorizationPolicy`。
- `dxgate` 保护 Gateway API HTTP 流量：验证 JWT 签名、`issuer`、`audience` 和有效期，生成 `requestPrincipal`，再执行基于 `requestPrincipals` 与 `request.auth.claims[...]` 的 `AuthorizationPolicy`。
- `dubbod` 按 namespace 和 workload selector 选择策略。无法由当前数据面可靠验证的字段不会被降级为更宽松的规则。

认证失败或授权不匹配都在数据面直接拒绝。dxproxy 暴露 `dxproxy_authorization_denials_total`，dxgate 把拒绝计入 `policy_denied` 指标并记录请求失败日志。

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

东西向授权使用证书中已经验证的 SPIFFE 身份：

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: allow-orders-client
  namespace: orders
spec:
  selector:
    matchLabels:
      app: orders
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/frontend/sa/frontend
```

存在任意 ALLOW 策略时，没有匹配 ALLOW 的调用会被默认拒绝；匹配 DENY 的调用始终优先拒绝。`principals: ["*"]` 只匹配经过 mTLS 验证且具有身份的连接，不会把宽容模式下的明文连接当成已认证调用方。

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

## 当前边界

当前必须具备且已经进入运行链路的是证书签发与轮换、mTLS、JWT、SPIFFE/JWT 主体授权、JWT 声明授权、ALLOW/DENY 和拒绝可观测性。同一条 rule 不能混用工作负载 `principals` 与 JWT 条件；校验 webhook 会拒绝这种无法由单个数据面完整验证的配置。

外部授权、审计模拟、JWT 声明复制到请求头、来源 IP/Ingress 专用授权、信任域迁移兼容和可配置 TLS 最低版本不属于当前安全架构。
