> 目前属于设计完毕阶段，该任务需要使用示例，即将推出


本任务演示如何为 `httpbin` 启用 JWT 请求认证，并通过 `AuthorizationPolicy` 要求请求携带指定用户身份和 `groups` 声明。

## 前提条件

```bash
kubectl create ns foo
kubectl label namespace foo dubbo-injection=enabled
kubectl -n foo create deploy httpbin --image=docker.io/mccutchen/go-httpbin:2.19.0 --port=8080
kubectl -n foo expose deploy httpbin --port=8000 --target-port=8080
```

## 启用 JWT 请求认证

`RequestAuthentication` 只校验请求里存在的 JWT。无效 JWT 会被拒绝；没有 JWT 的请求会继续放行。

```bash
cat <<EOF | kubectl apply -f -
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
  - issuer: "testing@secure.dubbo.apache.org"
    jwksUri: "https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/tools/jwt/sample/jwks.json"
EOF
```

`jwksUri` 必须是 `http`/`https` URL，相对路径会被校验 webhook 拒绝。离线环境可以改用内联 `jwks` 字段直接嵌入 JWKS 内容（与 `jwksUri` 二选一）。

验证没有 JWT 的请求被允许：

```bash
kubectl -n foo run curl --rm -i --restart=Never --image=curlimages/curl:8.5.0 -- \
  curl -s -o /dev/null -w "%{http_code}\n" http://httpbin.foo.svc.cluster.local:8000/get
```

预期返回 `200`。

验证无效 JWT 被拒绝：

```bash
kubectl -n foo run curl --rm -i --restart=Never --image=curlimages/curl:8.5.0 -- \
  curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer invalid-token" \
  http://httpbin.foo.svc.cluster.local:8000/get
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
  namespace: foo
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
kubectl -n foo run curl --rm -i --restart=Never --image=curlimages/curl:8.5.0 -- \
  curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  http://httpbin.foo.svc.cluster.local:8000/get
```

预期返回 `200`。

验证没有 JWT 的请求被拒绝：

```bash
kubectl -n foo run curl --rm -i --restart=Never --image=curlimages/curl:8.5.0 -- \
  curl -s -o /dev/null -w "%{http_code}\n" http://httpbin.foo.svc.cluster.local:8000/get
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
  namespace: foo
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
kubectl -n foo run curl --rm -i --restart=Never --image=curlimages/curl:8.5.0 -- \
  curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_GROUP" \
  http://httpbin.foo.svc.cluster.local:8000/get
```

预期返回 `200`。

验证 JWT 不包含 `groups` 声明时被拒绝：

```bash
export TOKEN_NO_GROUP="<valid-jwt-without-groups>"
kubectl -n foo run curl --rm -i --restart=Never --image=curlimages/curl:8.5.0 -- \
  curl -s -o /dev/null -w "%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN_NO_GROUP" \
  http://httpbin.foo.svc.cluster.local:8000/get
```

预期不是 `200`。

## 清理

```bash
kubectl -n foo delete requestauthentication jwt-example
kubectl -n foo delete authorizationpolicy require-jwt
kubectl -n foo delete deploy httpbin
kubectl -n foo delete svc httpbin
kubectl delete ns foo
```
