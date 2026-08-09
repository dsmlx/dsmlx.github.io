# 统一 DxgateService API

`DxgateService` 是 dxgate 非标准应用协议的唯一网格 API：

```text
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
```

一个对象只能选择 `spec.ai`、`spec.mcp`、`spec.a2a` 之一。普通 HTTP 后端不创建 `DxgateService`，继续直接引用 Kubernetes `Service`。

## LLM

OpenAI 客户端格式可以路由到 OpenAI 或 Anthropic。凭据只写 Secret 引用：

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
metadata:
  name: chat
spec:
  ai:
    endpoint: https://api.anthropic.com
    provider:
      anthropic:
        model: claude-sonnet-4
      credential:
        name: provider-key
        key: token
    models: [claude-sonnet-4]
    routes:
      /v1/chat/completions: COMPLETIONS
  policies:
    timeout: 30s
    retry:
      attempts: 2
      statusCodes: [502, 503, 504]
```

## MCP

一个对象可以联合多个 MCP Service：

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
metadata:
  name: tools
spec:
  mcp:
    targets:
      - name: search
        static:
          backendRef: {name: search-mcp}
          port: 8080
        tools: [search]
      - name: calendar
        static:
          backendRef: {name: calendar-mcp}
          port: 8080
        tools: [calendar]
```

## A2A

集群内 Agent 优先使用 `backendRef`；外部 Agent 可以改用 `host`：

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
metadata:
  name: planner
spec:
  a2a:
    backendRef: {name: planner-agent}
    port: 8080
    path: /a2a
    agent: planner
```

## HTTPRoute

普通 Service 和 DxgateService 都使用 `backendRefs`，但一个 rule 不能混用两种类型：

```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: chat
spec:
  parentRefs:
    - name: public
  rules:
    - matches:
        - path: {type: PathPrefix, value: /anthropic}
      filters:
        - type: URLRewrite
          urlRewrite:
            path:
              type: ReplacePrefixMatch
              replacePrefixMatch: /v1
      backendRefs:
        - group: networking.dubbo.apache.org
          kind: DxgateService
          name: chat
```

完整的无付费 key 样例位于仓库 `samples/ai-mesh`，覆盖普通 `/users`、`/orders`、OpenAI、Anthropic、MCP 与 A2A。
