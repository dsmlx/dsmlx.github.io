# Helm

本安装指南使用命令行工具 Helm。请遵循本指南使用 Helm 安装和配置 Dubbo 网格。

## 先决条件

```bash
helm repo add dubbo https://charts.dubbo.apache.org
helm repo update
```

## 安装步骤

安装 Dubbo Base Chart，它包含了集群范围的自定义资源定义 (CRD)，这些资源必须在部署 Dubbo 控制平面之前安装：
```bash
helm install base dubbo/base -n dubbo-system --create-namespace
```

安装 Dubbo Discovery Chart，它用于部署 dubbo 的服务：
```bash
helm install dubbod dubbo/dubbod -n dubbo-system
```

## 卸载

列出在命名空间 dubbo-system 中安装的所有 Dubbo Chart
```bash
helm ls -n dubbo-system
```

删除 Dubbo Base Chart：
```bash
helm delete base -n dubbo-system
```

删除 Dubbo Discovery Chart：
```bash
helm delete dubbod
```

删除命名空间 dubbo-system：
```bash
kubectl delete namespace dubbo-system
```