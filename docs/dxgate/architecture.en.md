# Gateway architecture

dxgate is the data plane and `dubbod` is its only control plane. Ordinary HTTP and AI backends enter one mesh configuration path.

```mermaid
flowchart LR
  subgraph cp["Control plane (external)"]
    direction TB
    dubbod["dubbod<br/>Gateway API resources"]
  end

  subgraph kube["Kubernetes API"]
    direction TB
    crd["DxgateService"]
  end

  subgraph dp["Data plane (dxgate)"]
    direction TB
    xds["xDS client"]
    informer["CRD controller"]
    store["ConfigStore<br/>ownership · deltas · visible conflicts"]
    proxy["proxy<br/>snapshot → routing → policies"]
  end

  clients["Clients"]
  targets["Services,<br/>LLM providers,<br/>MCP and A2A targets"]

  dubbod -- "streaming xDS<br/>(delta updates)" --> xds
  crd -- "watch" --> informer
  informer -- "status" --> crd
  xds -- "listeners · clusters" --> store
  informer -- "providers · backends<br/>routes · policies" --> store
  store -- "immutable snapshot" --> proxy
  clients -- "requests" --> proxy
  proxy -- "routes to" --> targets

  classDef ext fill:#FFFFFF,stroke:#636F80,stroke-width:1.2px,color:#1A2332;
  classDef core fill:#FFFFFF,stroke:#1D5BC4,stroke-width:1.5px,color:#1A2332;
  class dubbod,crd,clients,targets ext;
  class xds,informer,store,proxy core;
```

## API boundary

- Ordinary HTTP, gRPC, and Dubbo Triple backends remain core Kubernetes `Service` objects.
- OpenAI, Anthropic, MCP, and A2A backends all use
  `networking.dubbo.apache.org/v1alpha3` `DxgateService`.
- Gateway API `HTTPRoute.backendRefs` references both kinds.
- `Dxgate`, `DxgateBackend`, `DxgateRoute`, and `DxgatePolicy` are no longer part of the runtime path.

## Control plane

`dubbod` watches `Gateway`, `HTTPRoute`, `Service`, and `DxgateService`, validates their types and references, then compiles ordinary and agent routes into the same RDS `RouteConfiguration`. A `DxgateService` update triggers a new xDS push without restarting the data plane.

Cross-namespace `DxgateService` references are currently rejected. Credential references stay in the `DxgateService` namespace, avoiding cluster-wide Secret access.

## Data plane

dxgate consumes only xDS from `dubbod`. It watches no private routing CRDs and merges no second configuration API. Its only Kubernetes access is reading same-namespace Secret values already referenced by RDS; its ServiceAccount has only `secrets/get`.

Each RDS update produces an immutable runtime snapshot. Ordinary HTTP/gRPC uses listeners, virtual hosts, and clusters directly. LLM, MCP, and A2A parse protocol fields before applying authentication, rate and token limits, timeouts, retries, and header transforms.

dxgate subscribes to SDS `default` and `ROOTCA` resources over the same ADS connection. Validated rotations enter the immutable snapshot before ACK; invalid rotations are NACKed while the last valid certificate remains active. SDS private keys are redacted from `/debug/config`.

See [the unified DxgateService API](service.md) for complete resources.
