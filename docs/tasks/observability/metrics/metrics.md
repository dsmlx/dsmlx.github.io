# 指标

dubbod 的指标分为控制面和 Gateway API 流量面。dubbod 暴露 xDS、SDS、服务发现和运行状态指标；

dxgate 暴露 HTTP 路由请求数、失败数和延迟直方图，标签包含 `namespace`、`gateway`、`route`、`cluster`、`method`、`status_code`。

## 前提

已安装 dubbod，并且集群中有托管 `Gateway` 和至少一个 `HTTPRoute`。应用自身指标需要应用容器主动暴露 Prometheus endpoint；Kdubbo 不会透明抓取任意应用内部指标。

## 部署

推荐通过 operator 安装观测组件：

```bash
# 只装 Prometheus 和 Grafana
dubboctl install --set components.prometheus.enabled=true --set components.grafana.enabled=true

# 或安装完整观测栈（Prometheus、Grafana、tracing、OpenTelemetry collector）
dubboctl install --set profile=observability
```

也可以直接 apply 示例清单：

```bash
kubectl apply -f samples/addons/prometheus.yaml
kubectl apply -f samples/addons/grafana.yaml
```

安装完成后可用 `dubboctl dashboard prometheus` 和 `dubboctl dashboard grafana` 直接打开对应组件（自动端口转发）。

## 产生流量

对经过 dxgate 的入口或出口路由发送请求：

```bash
kubectl -n default run curl --image=curlimages/curl --rm -it --restart=Never -- \
  curl -sS http://httpbin.default.svc.cluster.local/get
```

产生一条 5xx 流量用于验证错误率：

```bash
kubectl -n default run curl-500 --image=curlimages/curl --rm -it --restart=Never -- \
  curl -sS -o /dev/null -w "%{http_code}\n" http://httpbin.default.svc.cluster.local/status/500
```

## 查询结果

打开 Prometheus：

```bash
kubectl -n dubbo-system port-forward svc/prometheus 9090:9090
```

常用 PromQL：

```promql
dubbod_uptime_seconds
dubbod_xds
dxgate_ready
sum by (namespace, gateway, route, cluster, method) (rate(dxgate_http_route_requests_total[1m]))
sum by (namespace, gateway, route, cluster, status_code) (rate(dxgate_http_route_requests_total{status_code=~"5.."}[1m]))
histogram_quantile(0.95, sum by (le, namespace, gateway, route, cluster) (rate(dxgate_http_route_latency_ms_bucket[5m])))
histogram_quantile(0.99, sum by (le, namespace, gateway, route, cluster) (rate(dxgate_http_route_latency_ms_bucket[5m])))
sum by (type) (rate(dubbod_total_xds_rejects[5m]))
sum(rate(dubbod_sds_certificate_errors_total[5m]))
```

打开 Grafana：

```bash
kubectl -n dubbo-system port-forward svc/grafana 3000:3000
```

浏览器打开 `http://127.0.0.1:3000`，进入 `Dubbo / Dubbo control plane Observability` 仪表盘查看控制面指标。

## 常见失败排查

Prometheus 没有 dxgate 指标时，先确认 dxgate Pod 带有抓取注解：

```bash
kubectl -n default get pod -l app.kubernetes.io/name=dxgate -o yaml | grep prometheus.io
```

`dxgate_http_route_*` 没有数据时，确认请求实际经过托管 Gateway 或显式 egress Gateway；当前不做 sidecar/iptables 级透明流量捕获。

`dubbod_total_xds_rejects` 增长时，查看控制面日志：

```bash
kubectl -n dubbo-system logs deploy/dubbod | grep -i xds
```

## 清理

```bash
kubectl delete -f samples/addons/grafana.yaml
kubectl delete -f samples/addons/prometheus.yaml
```
