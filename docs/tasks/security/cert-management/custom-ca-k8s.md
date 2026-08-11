# 使用 Kubernetes CSR 自定义 CA 集成

Kubernetes CSR 模式由 dubbod 创建并审批证书请求，外部 signer 负责签名：

```bash
helm upgrade --install dubbod manifests/charts/dubbod \
  -n dubbo-system --create-namespace \
  --set security.ca.provider=kubernetes \
  --set-string security.ca.kubernetes.signerName=example.com/dubbo-workload \
  --set-string security.ca.kubernetes.rootConfigMapName=dubbo-ca-root-cert
```

部署前确认 signer 已安装并只为允许的 SPIFFE 身份签发：

```bash
kubectl get certificatesigningrequests
kubectl auth can-i create certificatesigningrequests \
  --as system:serviceaccount:dubbo-system:dubbod
kubectl auth can-i approve signers.certificates.k8s.io \
  --resource-name example.com/dubbo-workload \
  --as system:serviceaccount:dubbo-system:dubbod
```

Chart 会为配置的 signer 创建最小审批 RBAC。若组织要求独立审批，应在部署前调整
Chart RBAC 并使用外部审批控制器。不要授予通配 signer 审批权；RBAC 应固定到配置的
`signerName`。
