本任务演示如何在托管 Gateway（dxgate）上为 `httpbin` 启用 JWT 请求认证，并通过 `AuthorizationPolicy` 要求请求携带指定用户身份和 `groups` 声明。JWT 校验发生在 HTTP 网关数据面，不发生在仅转发字节流的 dxproxy。

## 前提条件

部署仓库中的 `httpbin`、Gateway 和 HTTPRoute，然后把本地端口转发到 dxgate：

```bash
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
kubectl rollout status deploy/dxgate-gateway
kubectl port-forward svc/dxgate-gateway 18080:80
```

## 启用 JWT 请求认证

`RequestAuthentication` 只校验请求里存在的 JWT。无效 JWT 会被拒绝；没有 JWT 的请求会继续放行。

```bash
cat <<EOF | kubectl apply -f -
apiVersion: security.dubbo.apache.org/v1alpha3
kind: RequestAuthentication
metadata:
  name: jwt-example
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  jwtRules:
  - issuer: "testing@secure.dubbo.apache.org"
    jwksUri: "https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/tools/jwt/sample/jwks.json"
EOF
```

`jwksUri` 必须是 `http`/`https` URL，相对路径会被校验 webhook 拒绝。离线环境可以改用内联 `jwks` 字段直接嵌入 JWKS 内容（与 `jwksUri` 二选一）。

另开终端，验证没有 JWT 的请求被允许：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18080/get
```

预期返回 `200`。

验证无效 JWT 被拒绝：

```bash
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer invalid-token" \
  http://127.0.0.1:18080/get
```

预期不是 `200`。

## 要求 JWT 身份

获取 `iss` 和 `sub` 都为 `testing@secure.dubbo.apache.org` 的 JWT。该 JWT 会生成如下 `requestPrincipal`：

```text
testing@secure.dubbo.apache.org/testing@secure.dubbo.apache.org
```

应用授权策略：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["testing@secure.dubbo.apache.org/testing@secure.dubbo.apache.org"]
EOF
```

验证有效 JWT 被允许：

```bash
export TOKEN="<valid-jwt-with-testing-issuer-and-subject>"
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://127.0.0.1:18080/get
```

预期返回 `200`。

验证没有 JWT 的请求被拒绝：

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://127.0.0.1:18080/get
```

预期不是 `200`。

## 要求 groups 声明

获取包含如下声明的 JWT：

```json
{
  "iss": "testing@secure.dubbo.apache.org",
  "sub": "testing@secure.dubbo.apache.org",
  "groups": ["group1", "group2"]
}
```

更新授权策略：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: require-jwt
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: ALLOW
  rules:
  - from:
    - source:
        requestPrincipals: ["testing@secure.dubbo.apache.org/testing@secure.dubbo.apache.org"]
    when:
    - key: request.auth.claims[groups]
      values: ["group1"]
EOF
```

验证包含 `groups: ["group1", "group2"]` 的 JWT 被允许：

```bash
export TOKEN_GROUP="<valid-jwt-with-group1-and-group2>"
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_GROUP" \
  http://127.0.0.1:18080/get
```

预期返回 `200`。

验证 JWT 不包含 `groups` 声明时被拒绝：

```bash
export TOKEN_NO_GROUP="<valid-jwt-without-groups>"
curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_NO_GROUP" \
  http://127.0.0.1:18080/get
```

预期不是 `200`。

## 清理

```bash
kubectl delete requestauthentication jwt-example
kubectl delete authorizationpolicy require-jwt
kubectl delete -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```
