> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

Dubbo 的可观测性围绕控制面和流量面建设。控制面的配置、xDS、SDS、服务发现和日志指标；流量面的 dxgate 网关数据面暴露路由、上游集群、策略拒绝、失败和延迟指标，并可通过 OpenTelemetry 上报链路追踪。

## 指标

dubbod 通过 `/metrics` 暴露控制面指标。托管 Gateway 创建的 dxgate Pod 带有 Prometheus 抓取注解，Prometheus 可以通过 Kubernetes Pod discovery 自动采集 `/metrics`。dxgate HTTP 指标使用稳定标签 `namespace`、`gateway`、`route`、`cluster`、`method`、`status_code`。

## 链路追踪

打开全网格追踪。开启后托管 Gateway 自动上报 span,注入的 proxyless 工作负载自动获得 `OTEL_EXPORTER_OTLP_ENDPOINT` 等标准 OpenTelemetry 环境变量:

```yaml
apiVersion: install.dubbo.apache.org/v1alpha1
kind: DubboOperator
spec:
  meshConfig:
    enableTracing: true
    extensionProviders:
    - name: jaeger
      opentelemetry:
        port: 4317
        service: tracing.dubbo-system.svc.cluster.local
```

## 日志

默认日志输出到容器标准输出，由 Kubernetes 日志系统采集。后续会逐渐支持。

## 同步状态

控制平面在监控端口（默认 8080）上提供 debug 端点，用于回答 "我的配置到底推没推到数据面"：

- `/debug/syncz`：每个已连接 proxy 的 xDS 同步状态（各资源类型的 nonce 已发送/已确认、资源数量、最近错误）；
- `/debug/configz`：控制面当前加载的配置资源清单；
- `/debug/registryz`：服务注册表内容。

`dubboctl proxy-status` 封装了 `/debug/syncz`，按 proxy 输出 CDS/LDS/EDS/RDS 的 `SYNCED`/`STALE`/`ERROR` 状态表。

