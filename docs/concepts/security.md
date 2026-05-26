# 安全

安全基础架构负责工作负载身份、传输加密、请求认证和访问控制。mTLS 是 Mutual TLS，表示客户端和服务端使用证书互相校验身份；JWT 是 JSON Web Token，用于在 HTTP 请求中携带最终用户身份。

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

## mTLS 模式

- `PERMISSIVE`：同时接受明文和 mTLS 流量。服务端注入的 `xserver` 会接收 mTLS 流量并转发到本地业务端口，同时不打断已有明文流量。
- `STRICT`：只接受 mTLS 流量。没有客户端证书或未接入网格的明文请求会被拒绝。
- `DISABLE`：关闭入站 mTLS。

## 自动 mTLS

客户端出站 mTLS 由 `MeshService.trafficPolicy.tls.mode: DUBBO_MUTUAL` 开启；服务端入站 mTLS 由 `PeerAuthentication` 控制。两者结合后，控制面会通过 xDS 下发证书、路由和端点信息，业务代码不需要加载证书或处理 TLS 握手。

全局自动 mTLS 使用 root namespace 策略；namespace 级别策略可以只影响某个 namespace，适合分阶段迁移。

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
    jwksUri: tools/jwt/samples/jwks.json
```

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
