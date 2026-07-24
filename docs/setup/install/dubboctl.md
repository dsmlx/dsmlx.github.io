# Dubboctl

本安装指南使用命令行工具 dubboctl，它提供了丰富的定制 Dubbo 控制平面以及数据平面 adapter。可以选取任意一个 Dubbo 内置的配置档，为您的特定需求进一步定制配置。

dubboctl 命令通过命令行的选项支持完整的 DubboOperator API，这些选项用于单独设置、以及接收包含 DubboOperator 定制资源（CR）的 yaml 文件。

## 先决条件
开始之前，检查下列先决条件:

- [下载 Dubbod 发行版](../../overview/index.md)

## 使用配置档安装 Dubbo
```bash
dubboctl install -y
```
此命令在 Kubernetes 集群上安装 default 配置档。

可以选取任意一个 dubbo 内置的配置档
```bash
dubboctl install --set profile=demo
```
可以通过在命令行传递配置档名称的方式，安装到集群。

内置配置档：

| 配置档 | 内容 |
| --- | --- |
| `default` | 控制面（base + dubbod），生产安装的起点 |
| `demo` | 控制面 + 完整观测栈（Prometheus、Grafana、tracing、OpenTelemetry collector），用于评估和演示 |
| `observability` | 只安装观测组件，用于在已有控制面上补装 |
| `empty` | 不安装任何组件，作为自定义基底 |

也可以单独开关某个组件：

```bash
dubboctl install --set components.prometheus.enabled=true --set components.grafana.enabled=true
```

## 使用 DubboOperator CR 文件安装

`-f` 传入包含 `DubboOperator` 定制资源的 yaml 文件，适合把安装配置放进版本管理。例如网格级开启链路追踪：

```bash
cat <<EOF > ./tracing.yaml
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
EOF
dubboctl install -f ./tracing.yaml --skip-confirmation
```

`spec.meshConfig` 会合并进 dubbod 消费的 `dubbo` ConfigMap，并在安装时按 MeshConfig 模式严格校验。`-f` 与 `--set` 可以同时使用，`--set` 优先。

## 安装前生成清单文件
```bash
dubboctl manifest generate > $HOME/generated-manifest.yaml
```

`manifest generate` 同样支持 `-f`，可以在 apply 前审查最终产物。

## 卸载
要从集群中完整卸载 Dubbo，运行下面命令
```bash
dubboctl uninstall --remove -y
```
将移除所有 Dubbo 资源,后续版本将会支持指定文件。

命名空间 dubbo-system 默认不会被移除。如果不再需要用下面命令移除该命名空间
```bash
kubectl delete namespace dubbo-system
```
