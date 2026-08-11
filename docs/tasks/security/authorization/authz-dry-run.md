# 模拟运行

`dryRun: true` 评估规则并记录命中，但不执行拒绝：

```yaml
apiVersion: security.dubbo.apache.org/v1alpha3
kind: AuthorizationPolicy
metadata:
  name: preview-admin-deny
  namespace: default
spec:
  selector:
    matchLabels:
      app: httpbin
  action: DENY
  dryRun: true
  rules:
    - to:
        - operation:
            paths: [/admin*]
```

`AUDIT` 同样不改变请求结果，适合持续审计；`dryRun` 适合把即将执行的 ALLOW、
DENY 或 CUSTOM 策略先投影到运行时。

```bash
kubectl apply -f preview.yaml
kubectl logs -n default -l app=httpbin -c dxgate --since=10m
```

确认真实请求产生预期命中且没有误伤后，删除 `dryRun` 字段。不要只检查资源已创建；
必须发送正反例流量验证 selector、来源和操作条件。
