# Configure on-demand activation

This task scales an HTTP/unary gRPC Service to zero and verifies that its first north-south or Inherent east-west request completes. See [on-demand activation](../../concepts/scalability.md) for the model.

## 1. Install KEDA

```bash
helm repo add kedacore https://kedacore.github.io/charts
helm upgrade --install keda kedacore/keda -n keda --create-namespace
```

## 2. Deploy the target and Activator

Create the namespace, inject the target, and create a dedicated Activator Gateway named `dxgate-gateway`. The repository's `samples/activation` directory contains the complete manifests:

```bash
kubectl create ns activation
kubectl label ns activation dubbo-injection=enabled
kubectl apply -f samples/activation/payment.yaml
```

`dubbod` creates the dxgate Deployment and Service for `dxgate-gateway` and injects its activation control-plane address.

## 3. Declare policy

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: ServiceActivationPolicy
metadata:
  name: payment
  namespace: activation
spec:
  targetRef:
    kind: Service
    name: payment
  autoscalerRef:
    group: keda.sh
    kind: ScaledObject
    name: payment
  protocols: [HTTP, GRPC_UNARY]
  requestTimeout: 30s
  maxPendingRequests: 100
  backendServiceAccounts: [payment]
```

```bash
kubectl apply -f samples/activation/activation-policy.yaml
```

`backendServiceAccounts` is the east-west mTLS identity boundary; do not use a wildcard in production.

## 4. Let KEDA read pending demand

```bash
kubectl apply -f samples/activation/scaledobject.yaml
```

`minReplicaCount` is 0 and the external scaler address is `dubbod-activation.dubbo-system.svc.cluster.local:26030`. Do not let Deployment replicas or an HPA write the same count.

## 5. Verify

```bash
kubectl -n activation wait --for=condition=Ready scaledobject/payment --timeout=180s
kubectl -n activation get serviceactivationpolicy payment \
  -o jsonpath='{range .status.conditions[*]}{.type}={.status}{"\n"}{end}'
kubectl -n activation get deploy payment -w
```

Status should contain `Accepted=True`, `Eligible=True`, `ScalerReady=True`, and `ActivatorReady=True`. After the Deployment reaches `0/0`, send a request:

```bash
time curl -s http://$GATEWAY/payment/healthz
```

It waits through cold start and succeeds. For east-west verification, call `payment.activation.svc.cluster.local` from an injected Inherent client. Cold traffic crosses the Activator; after hot EDS converges it reaches the backend directly.

Inspect the Activator:

```bash
kubectl -n activation port-forward deploy/dxgate-gateway 15021:26021
curl -s localhost:15021/metrics | grep dxgate_activation_requests_held
curl -s localhost:15021/debug/config
```

## Troubleshooting

- `Accepted=False`: invalid policy or target reference.
- `Eligible=False`: missing Service or unsupported protocol.
- `ScalerReady=False`: missing or unready `ScaledObject`.
- `ActivatorReady=False`: `dxgate-gateway` is not Programmed.
- Pending rises but replicas stay at 0: inspect the KEDA scaler address, dubbod activation Services, and logs.
- 401/502 or TLS handshake failure: verify `backendServiceAccounts` covers backend and Activator identities.

Use `minReplicaCount: 1` for streaming RPCs, long-lived connections, or startup times beyond the caller deadline.
