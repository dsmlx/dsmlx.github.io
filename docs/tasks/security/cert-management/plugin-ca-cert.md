# 插入 CA 证书

准备包含 CA 证书和私钥的 Secret：

```bash
kubectl -n dubbo-system create secret generic dubbo-ca \
  --from-file=ca-cert.pem \
  --from-file=ca-key.pem \
  --from-file=cert-chain.pem \
  --from-file=root-cert.pem
```

安装控制面：

```bash
helm upgrade --install dubbod manifests/charts/dubbod \
  -n dubbo-system --create-namespace \
  --set security.ca.provider=plugin \
  --set security.ca.plugin.secretName=dubbo-ca
```

先在非生产 namespace 验证证书链、SPIFFE URI SAN 和 mTLS。轮换时先更新信任 bundle，
再更新签发证书；直接替换根会中断仍持有旧证书的工作负载。Secret key 名称必须与
Chart 约定一致，私钥读取权限只授予 dubbod ServiceAccount。
