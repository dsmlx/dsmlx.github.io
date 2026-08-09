# On-demand activation and scale to zero

On-demand activation lets an HTTP or unary gRPC service scale to zero while idle. dxgate holds the first cold request until KEDA scales the workload and EDS converges, instead of returning 503.

## North-south and east-west

A north-south request already crosses a managed Gateway, where dxgate can hold it directly.

A proxyless east-west caller normally connects directly to EDS endpoints. When the target reaches zero, `dubbod` publishes the namespace's dedicated Activator Gateway, `dxgate-gateway`, instead of empty EDS. The Activator holds the request by its original Host. When the backend becomes Ready, EDS returns to real endpoints and new requests resume the direct hot path.

Both ingress and in-mesh HTTP or unary gRPC calls can therefore scale to zero. Streaming RPCs, long-lived connections, and non-replayable requests must retain at least one replica.

## Ownership

| Component | Owns | Does not own |
| --- | --- | --- |
| `ServiceActivationPolicy` | target, protocols, hold timeout, pending cap, failure policy | replica count |
| KEDA `ScaledObject` | reads pending and is the sole replica-count writer | request holding |
| dxgate Activator | holds requests, reports pending, releases after endpoints arrive | workload scaling |

## Cold-start sequence

1. KEDA scales the Service to zero.
2. `dubbod` points cold EDS at `dxgate-gateway`.
3. The Activator holds demand within policy limits and reports pending.
4. KEDA's external scaler queries `dubbod-activation` and scales from 0 to 1.
5. The Pod becomes Ready and `dubbod` restores real EDS.
6. The held request completes; following traffic uses the direct hot path.

## HA and mTLS

The Activator and dubbod support multiple replicas and PodDisruptionBudgets. Gateways report to every endpoint of headless `dubbod-activation-replicas`; KEDA queries load-balanced `dubbod-activation`, so each control-plane replica exposes the same pending state.

CDS stays stable while east-west EDS switches cold and hot endpoints. `backendServiceAccounts` must declare backend identities; the control plane publishes both backend and Activator SANs to avoid a certificate-validation gap.

## Cost and limits

- The first request pays for KEDA polling, scheduling, image pull, process startup, certificates, and initial xDS convergence.
- `requestTimeout` must exceed measured cold start but remain below the caller deadline.
- `maxPendingRequests` caps one target; the gateway also has a global backlog cap.
- Streaming, long-lived, stateful, or very slow-starting workloads should not scale to zero.
- Monitor `dxgate_activation_requests_held`, policy `ScalerReady` / `ActivatorReady`, KEDA/HPA conditions, and request failures.

See [the activation task](../tasks/scalability/activation.md) for configuration and validation.
