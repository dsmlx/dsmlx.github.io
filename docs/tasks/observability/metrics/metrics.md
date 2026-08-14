# 指标

dubbod 暴露控制面运行状态和 xDS 指标。托管 Gateway 的 dxgate 暴露请求数、失败数、并发和延迟指标。

## 前提

已安装 dubbod，并且集群中有托管 `Gateway` 和至少一个 `HTTPRoute`。

## 开启指标

Telemetry API 决定托管工作负载是否暴露指标。下面配置在网格范围启用 Prometheus provider：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: telemetry.dubbo.apache.org/v1alpha1
kind: Telemetry
metadata:
  name: metrics-tags
  namespace: dubbo-system
spec:
  metrics:
  - providers:
    - name: prometheus
EOF
```

关闭网格指标：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: telemetry.dubbo.apache.org/v1alpha1
kind: Telemetry
metadata:
  name: metrics-tags
  namespace: dubbo-system
spec:
  metrics:
  - enabled: false
EOF
```

## 安装相关组件

addons 提供独立的采集和展示组件：

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
```

## 产生流量

请求必须经过托管 Gateway：

```bash
curl http://$GATEWAY_URL/payment
```

## 清理

```bash
kubectl -n dubbo-system delete telemetry metrics-tags
kubectl delete -f samples/addons/grafana.yaml
kubectl delete -f samples/addons/prometheus.yaml
```
