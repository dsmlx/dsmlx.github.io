# 概述
Dubbo Mesh 是 2025 年发起的开源服务网格。Inherent 是以 xDS 为核心的 SDK-native 网格模式：控制面直接向 gRPC 服务下发策略，服务间流量保持直连数据路径。

Inherent 模式主要以 xDS 协议为核心，加入到网格里面不会产生额外的代理负载加入到服务里面，而且依旧可以做到业务无侵入。 它依旧提供如下：

- 丰富的路由规则、超时、重试、故障注入对流量行为进行细粒度控制
- 提供路由流量自动负载均衡
- 集群内所有流量自动指标、日志、链路追踪
- 集群内提供双向 TLS 加密、基于身份的身份验证和鉴权来保护服务间的通信
- 内部和外部服务扩展到网格里面进行管理


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
