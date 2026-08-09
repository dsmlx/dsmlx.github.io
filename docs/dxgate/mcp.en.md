# MCP routing

One `DxgateService.spec.mcp` can federate multiple Kubernetes Services behind one MCP endpoint:

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

The `HTTPRoute` references `tools` with `group: networking.dubbo.apache.org` and `kind: DxgateService`. Each target's `backendRef` is an ordinary Kubernetes Service.

## Runtime behavior

- `/mcp` and `/mcp/*` use the MCP handler.
- Requests without a tool, including `initialize` and `tools/list`, can use every target.
- `tools/call` selects a target from its declared `tools`.
- `mcp-session-id` pins follow-up requests to the initially selected target.
- Tools, prompts, resources, and resource templates are federated across targets with pagination handling.
- A duplicate tool is exposed as `{target}__{name}` and is decoded back to its target when called.

See [the unified DxgateService API](service.md) and [security](security.md) for HTTPRoute and policy configuration.
