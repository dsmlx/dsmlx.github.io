# 外部授权

先在控制面 MeshConfig 注册 provider：

```yaml
meshConfig:
  extensionProviders:
    - name: opa
      envoyExtAuthzHttp:
        service: opa.security.svc.cluster.local
        port: 9191
        pathPrefix: /check
        includeRequestHeadersInCheck:
          - authorization
          - x-jwt-sub
        headersToUpstreamOnAllow:
          - x-authz-user
        headersToDownstreamOnDeny:
          - x-authz-reason
        timeout: 2s
        failOpen: false
```

再把指定路径交给 provider：

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: protected-via-opa
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: CUSTOM
  provider:
    name: opa
  rules:
    - to:
        - operation:
            paths: [/protected*]
```

生产环境建议 `failOpen: false`。只把授权服务需要的头发送出去，并限制授权服务的
网络访问。provider 名称不存在、超时或返回拒绝时，请求不会进入业务后端。
