# A2A forwarding

An in-cluster Agent uses `DxgateService.spec.a2a.backendRef` to select a Kubernetes Service. An external Agent can use `host` instead; exactly one must be set.

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

One HTTPRoute can use this `DxgateService` for both `/.well-known/agent-card.json` and `/a2a`. See [the unified DxgateService API](service.md) for the complete reference.

## Agent Card

dxgate replaces the scheme and authority of absolute Agent Card `url` and `additionalInterfaces[].url` values with the address the client used for the gateway, preserving each path. This avoids leaking cluster-local addresses or bypassing gateway policy.

## Task affinity

dxgate extracts task IDs from A2A JSON-RPC requests and responses. Follow-up `tasks/get`, `tasks/cancel`, `tasks/resubscribe`, and continuation messages return to the backend that created the task. A streamed response is inspected while it passes through, so affinity does not wait for SSE completion.

## Paths

Standard paths are `/.well-known/agent-card.json`, `/a2a`, and `/a2a/*`. Use an HTTPRoute `URLRewrite` filter for a custom public path; rewriting happens before protocol handling.
