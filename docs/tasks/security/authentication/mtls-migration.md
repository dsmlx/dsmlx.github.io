# 双向 TLS 迁移

从明文迁移到 mTLS 时，先兼容、再观测、最后收紧。

## 1. 兼容阶段

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: PeerAuthentication
metadata:
  name: default
  namespace: payments
spec:
  mtls:
    mode: PERMISSIVE
```

`PERMISSIVE` 同时接收明文和持有网格证书的调用方。检查所有 Pod 已注入数据面，
并确认调用链使用 SPIFFE 工作负载身份。

## 2. 小范围收紧

为单个工作负载添加 selector：

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: PeerAuthentication
metadata:
  name: ledger-strict
  namespace: payments
spec:
  selector:
    matchLabels:
      app: ledger
  mtls:
    mode: STRICT
```

验证网格调用成功、未接入网格的明文请求失败，再逐服务扩大范围。

## 3. Namespace 或全网格收紧

移除 selector 可覆盖 namespace。放在 root namespace（默认 `dubbo-system`）的
无 selector 策略可作为全网格默认值。保留明确的回滚清单；若调用方尚未获得证书，
先恢复 `PERMISSIVE`，不要关闭证书校验。
