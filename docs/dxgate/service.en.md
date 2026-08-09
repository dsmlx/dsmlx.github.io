# Unified DxgateService API

`DxgateService` is the single mesh API for dxgate's non-standard application protocols:

```text
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
```

One object selects exactly one of `spec.ai`, `spec.mcp`, or `spec.a2a`. Ordinary HTTP backends do not create a `DxgateService`; they keep referencing a Kubernetes `Service` directly.

## LLM

The OpenAI client format can route to OpenAI or Anthropic. Credentials are Secret references only:

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

One object can federate multiple MCP Services:

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

Prefer `backendRef` for an in-cluster Agent; use `host` for an external Agent:

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

Core Services and DxgateServices both use `backendRefs`, but one rule cannot mix the two kinds:

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

The repository's no-paid-key `samples/ai-mesh` example covers ordinary `/users` and `/orders`, OpenAI, Anthropic, MCP, and A2A.
