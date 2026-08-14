# 指标

Telemetry API 控制 Inherent Client 和 Server 的指标生成规则。
规则由 Inherent 运行时在应用进程内执行，不创建代理工作负载。

## 前提

已安装 dubbod，并且工作负载已启用 Inherent 模式。

## 开启指标

下面配置在网格范围启用 Prometheus，并从 Client 和 Server 的请求计数中移除 `grpc_response_status` 标签：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: telemetry.dubbo.apache.org/v1alpha3
kind: Telemetry
metadata:
  name: metrics-tags
  namespace: dubbo-system
spec:
  metrics:
  - providers:
    - name: prometheus
    rules:
    - metric: REQUEST_COUNT
      scope: CLIENT_AND_SERVER
      tags:
        grpc_response_status:
          action: REMOVE
EOF
```

关闭网格指标：

```bash
cat <<EOF | kubectl apply -f -
apiVersion: telemetry.dubbo.apache.org/v1alpha3
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

调用 Inherent 服务：

```bash
curl http://$GATEWAY_URL/payment
```

## 清理

```bash
kubectl -n dubbo-system delete telemetry metrics-tags
kubectl delete -f samples/addons/grafana.yaml
kubectl delete -f samples/addons/prometheus.yaml
```
