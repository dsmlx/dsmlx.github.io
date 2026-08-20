本任务使用 `samples/app` 的 nginx 服务验证 Dubbo mTLS。mTLS 是 Mutual TLS，表示客户端和服务端使用证书互相校验身份；`grpc-inbound` 是注入到服务端 Pod 的入站代理，监听 `25080` 并转发到本地业务端口。

## 前提条件

```bash
kubectl create ns app
kubectl label namespace app dubbo-injection=enabled
kubectl apply -f samples/app/deployment.yaml
kubectl apply -f samples/app/httproute.yaml
```

## 启用宽容模式

`PERMISSIVE` 同时接受明文和 mTLS 流量，适合先接入网格再逐步收紧。

```bash
cat <<EOF | kubectl apply -f -
apiVersion: security.dubbo.apache.org/v1alpha3
kind: PeerAuthentication
metadata:
  name: app-permissive-mtls
  namespace: app
spec:
  mtls:
    mode: PERMISSIVE
EOF
```

## 验证宽容模式

确认 mTLS 请求可以进入服务：

```bash
kubectl -n app exec deploy/nginx-consumer -- \
  dubbod grpc-outbound --print-route --expect nginx-v1=50,nginx-v2=50
```

关键字段：

- `services[].ports[].mtlsMode: PERMISSIVE`

确认明文请求也可以进入服务：

```bash
kubectl -n app run plain-curl --rm -i --restart=Never \
  --image=curlimages/curl:8.5.0 -- \
  curl -s http://nginx.app.svc.cluster.local/
```

预期返回：

```text
nginx v1
```

或：

```text
nginx v2
```

## 收紧为严格模式

`STRICT` 只接受 mTLS 流量。未接入网格的明文请求会被拒绝。

```bash
kubectl -n app patch peerauthentication app-permissive-mtls --type='merge' \
  -p='{"spec":{"mtls":{"mode":"STRICT"}}}'
```

确认 mTLS 请求仍然成功：

```bash
kubectl -n app exec deploy/nginx-consumer -- \
  dubbod grpc-outbound --expect nginx-v1=50,nginx-v2=50 20 | sort | uniq -c
```

确认明文请求不能绕过 mTLS：

```bash
kubectl -n app run plain-curl --rm -i --restart=Never \
  --image=curlimages/curl:8.5.0 -- \
  curl -sv --max-time 5 http://nginx.app.svc.cluster.local/
```

预期不是正常 `200 OK`。

## 限制调用方身份

`STRICT` 证明连接持有网格证书；`AuthorizationPolicy` 继续限制允许访问的 SPIFFE 身份。示例中的 consumer 使用 `app/nginx` ServiceAccount：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: nginx-allow-client
  namespace: app
spec:
  selector:
    matchLabels:
      app: nginx
  action: ALLOW
  rules:
  - from:
    - source:
        principals:
        - cluster.local/ns/app/sa/nginx
EOF
```

确认允许的 mTLS 身份仍能访问：

```bash
kubectl -n app exec deploy/nginx-consumer -- \
  dubbod grpc-outbound --expect nginx-v1=50,nginx-v2=50 20 | sort | uniq -c
```

dxproxy 从经过 CA 验证的客户端证书 URI SAN 提取身份，不信任调用方自行设置的 HTTP 头。

## 启用全局自动 mTLS

把 `PeerAuthentication` 放在 root namespace `dubbo-system` 且不设置 `selector`，会作为全局策略应用到整个网格。

```bash
cat <<EOF | kubectl apply -f -
apiVersion: security.dubbo.apache.org/v1alpha3
kind: PeerAuthentication
metadata:
  name: default
  namespace: dubbo-system
spec:
  mtls:
    mode: STRICT
EOF
```

namespace 级别策略优先于全局策略，适合按 namespace 分阶段迁移。

## 清理

```bash
kubectl -n app delete httproute nginx-routing
kubectl -n app delete peerauthentication app-permissive-mtls
kubectl -n app delete authorizationpolicy nginx-allow-client
kubectl -n dubbo-system delete peerauthentication default
kubectl delete -f samples/app/deployment.yaml
kubectl delete ns app
```
