# Dubbo 工作负载的最低 TLS 版本配置

```yaml
meshConfig:
  minimumTlsVersion: TLSV1_3
```

通过 Helm 安装：

```bash
helm upgrade --install dubbod manifests/charts/dubbod \
  -n dubbo-system --create-namespace \
  --set meshConfig.minimumTlsVersion=TLSV1_3
```

允许值为 `TLSV1_2` 和 `TLSV1_3`。控制面把该值投影到 dxgate、grpc-engine 和
dxproxy 的 TLS 配置。验证顺序：

1. 先保持 `TLSV1_2`，盘点所有客户端。
2. 在测试 namespace 升级为 `TLSV1_3`。
3. 验证入站、出站和证书轮换。
4. 再升级全网格默认值。

不支持 TLS 1.3 的旧客户端会在握手阶段失败，不会降级到 TLS 1.2。
