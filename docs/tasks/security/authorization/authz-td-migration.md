# 信任域迁移

证书 principal 包含 SPIFFE 信任域。迁移信任域时，在 MeshConfig 临时接受旧域：

```yaml
proxy:
  clusterDomain: cluster.local
meshConfig:
  trustDomainAliases:
    - old.cluster.local
```

授权策略继续写逻辑工作负载身份：

```yaml
from:
  - source:
      principals:
        - cluster.local/ns/payments/sa/checkout
```

控制面会让旧信任域证书在迁移期映射到同一身份边界。步骤：

1. 添加旧域到 `trustDomainAliases`。
2. 轮换工作负载证书并验证跨版本调用。
3. 确认集群中不再存在旧域证书。
4. 删除 alias 并重新验证授权拒绝结果。

alias 会扩大临时信任边界，只加入确实受控的旧域。
