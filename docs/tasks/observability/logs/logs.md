# 日志

日志用于定位控制面配置下发、dxgate 转发、proxyless gRPC 注入和上游调用失败。Kdubbo 默认把日志写到容器标准输出，由 Kubernetes 日志系统采集。

## 前提条件

已安装 dubbod，并且使用托管 Gateway 承载流量。dxgate access log 默认开启，格式默认为 `text`。

## 部署

日志任务不需要单独部署后端。需要集中查询时，可以接入集群已有日志系统；需要本地验证时直接使用 `kubectl logs`。

## 配置 Gateway

开启 text access log：

```bash
kubectl -n default annotate gateway httpbin-gateway \
  gateway.dubbo.apache.org/access-log=true \
  gateway.dubbo.apache.org/access-log-format=text
```

切换 JSON access log：

```bash
kubectl -n default annotate gateway httpbin-gateway \
  gateway.dubbo.apache.org/access-log=true \
  gateway.dubbo.apache.org/access-log-format=json
```

关闭 access log：

```bash
kubectl -n default annotate gateway httpbin-gateway \
  gateway.dubbo.apache.org/access-log=false
```

## 产生流量

```bash
kubectl -n default run curl --image=curlimages/curl --rm -it --restart=Never -- \
  curl -sS http://httpbin.default.svc.cluster.local/get
```

## 查看结果

控制面日志：

```bash
kubectl -n dubbo-system logs deploy/dubbod
kubectl -n dubbo-system logs deploy/dubbod | grep -E "gateway|xds|dxgate"
```

dxgate 日志：

```bash
kubectl -n default logs deploy/dxgate-gateway -c dxgate
```

access log 字段固定包含 `namespace`、`gateway`、`route`、`cluster`、`method`、`host`、`path`、`status_code`、`latency_ms`、`upstream`、`trace_id`、`span_id`。出现 5xx 时，同时检查 Prometheus 中的 `dxgate_http_route_requests_total{status_code=~"5.."}`。

proxyless gRPC 日志：

```bash
kubectl -n default logs deploy/<workload> -c <app-container>
kubectl -n default logs deploy/<workload> -c dubbo-grpc-inbound
```

## 常见失败排查

看不到 access log 时，确认环境变量已渲染：

```bash
kubectl -n default get deploy dxgate-gateway -o yaml | grep DXGATE_ACCESS_LOG
```

JSON 格式不是纯结构化日志后端时，先确认 `gateway.dubbo.apache.org/access-log-format=json` 已生效；dxgate 输出的 access log 内容本身是固定 JSON 字段。

请求无法进入应用时，优先查看 `dubbo-grpc-inbound`；xDS 地址解析或证书拉取失败时，优先查看应用容器中的 `grpc-outbound` 日志。

## 清理

```bash
kubectl -n default annotate gateway httpbin-gateway \
  gateway.dubbo.apache.org/access-log- \
  gateway.dubbo.apache.org/access-log-format-
```
