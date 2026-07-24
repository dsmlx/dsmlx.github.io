# 概述
Dubbo Inherent Mesh 是 2025 年推出的 Proxyless 模式，源自于 [Istio Proxyless](https://istio.io/latest/blog/2021/proxyless-grpc/)，同样属于 gRPC xDS Proxyless 体系，
区别在于 Dubbo 控制平面的 xDS 是从 [Envoy ](https://github.com/envoyproxy/go-control-plane) 里面剥离出来的 [xDS API](https://github.com/kdubbo/xds-api)。

Proxyless 模式对于绝大多数应用开发者而言需要承担更多的工作属性。所以封装 Proxyless 模式里面需要修改应用程序代码的行为，它依旧提供如下：

- 丰富的路由规则、超时、重试、故障注入对流量行为进行细粒度控制
- 提供路由流量自动负载均衡
- 集群内所有流量自动指标、日志、链路追踪
- 集群内提供双向 TLS 加密、基于身份的身份验证和鉴权来保护服务间的通信

## 快速入门
转到 Dubbo 发布页面，自动下载适用于您操作系统的安装文件并获取最新版本（Linux 或 macOS）：

```bash
curl -L https://dubbo.apache.org/downloadDubbo | sh -
```

转到 Dubbo 包目录：

```bash
cd dubbo-0.4.4
```

使用 default 配置文件安装 Dubbo：

```bash
dubboctl install --set profile=default
```
