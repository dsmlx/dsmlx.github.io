# Access logs

The Telemetry API enables access logs for Inherent gRPC applications and managed `dxgate` gateways. Applications and gateways emit logs directly over OTLP to an OpenTelemetry Collector; no logging sidecar is required.

## Install the collector

```bash
kubectl apply -f samples/addons/opentelemetry.yaml
kubectl -n dubbo-system rollout status deployment/opentelemetry-collector
```

## Enable mesh access logs

This configuration enables OTLP access logs on both client and server reporters and adds a static attribute:

```bash
cat <<EOF | kubectl apply -f -
apiVersion: telemetry.dubbo.apache.org/v1alpha3
kind: Telemetry
metadata:
  name: logging-tags
  namespace: dubbo-system
spec:
  logging:
  - providers:
    - name: otel
    match:
      mode: CLIENT_AND_SERVER
    tags:
    - name: environment
      value: production
EOF
```

A selector-free Telemetry in an application namespace overrides the mesh configuration. A resource with `selector.matchLabels` applies only to matching workloads. Valid modes are `CLIENT`, `SERVER`, and `CLIENT_AND_SERVER`.

## Filter or disable logs

Emit only failed requests:

```yaml
spec:
  logging:
  - providers:
    - name: otel
    filter:
      expression: response.code >= 500
```

Disable logs for a workload:

```yaml
spec:
  selector:
    matchLabels:
      app: payment
  logging:
  - providers:
    - name: otel
    disabled: true
```

Filters support comparisons over access-log fields such as `response.code`, gRPC status, request method, and reporter. An invalid expression never broadens log output.

## Verify

Send traffic, then inspect the collector:

```bash
kubectl -n dubbo-system logs deployment/opentelemetry-collector --since=2m
```

Records include reporter, service or route, method, status, duration, and configured static tags. `dxgate` keeps its standard-output access log; Telemetry controls OTLP export.

## Clean up

```bash
kubectl -n dubbo-system delete telemetry logging-tags
kubectl delete -f samples/addons/opentelemetry.yaml
```
