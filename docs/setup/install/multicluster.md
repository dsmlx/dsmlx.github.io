> 未完成撰写的文档，因为版本迭代过快，跟新版本会存在一定差异，后续会进行补充完善。

本指南用于安装和使用主从跨网多集群。主集群运行 Dubbo 控制平面，远端集群通过 Secret 接入主控制面；跨集群流量通过每个集群的 east-west dxgate 转发，不直连远端 Pod IP。

## 前提条件

1. 主集群 API Server 能访问远端集群 API Server。
2. 两个集群共享同一信任根。
3. 两个集群都已安装 Dubbo base chart，或已安装 Gateway API CRD。
4. 远端 webhook 和远端 `dxgate` 都能访问主集群控制面地址。
5. 每个集群都有一个可被其他集群访问的 east-west gateway 地址。

## 安装主控制面

在主集群启用远端访问 Service 和 east-west gateway 配置：

```bash
dubboctl manifest generate \
  --set values.global.multicluster.remoteAccess.enabled=true \
  --set values.global.multicluster.remoteAccess.serviceType=NodePort \
  --set values.global.multicluster.remoteAccess.grpcPort=26010 \
  --set values.global.multicluster.remoteAccess.certificateHosts[0]=<主集群对外地址> \
  --set values.global.multicluster.eastWestGateway.enabled=true \
  --set values.global.multicluster.eastWestGateway.serviceType=NodePort \
  --set values.global.multicluster.eastWestGateway.nodePort=32443 \
  --set values.global.multicluster.eastWestGateway.gateways[0].clusterName=remote \
  --set values.global.multicluster.eastWestGateway.gateways[0].address=<远端 east-west 地址> \
  --set values.global.multicluster.eastWestGateway.gateways[0].port=15443 \
  --set values.global.multicluster.eastWestGateway.gateways[1].clusterName=Kubernetes \
  --set values.global.multicluster.eastWestGateway.gateways[1].address=<主集群 east-west 地址> \
  --set values.global.multicluster.eastWestGateway.gateways[1].port=15443 \
  | kubectl --context cluster1 apply -f -
```

## remote cluster

在主集群创建远端 Secret：

```bash
dubboctl multicluster create-remote-secret \
  --cluster-name remote \
  --kubeconfig ~/.kube/config2 \
  --context kubernetes-admin@kubernetes \
  | kubectl --context cluster1 apply -f -
```

在远端集群安装注入 webhook：

```bash
dubboctl multicluster generate-remote-manifest \
  --cluster-name remote \
  --webhook-url https://<主集群远端 webhook 地址>:<端口> \
  --xds-address <主集群远端 xDS/CA 地址>:<端口> \
  --ca-address <主集群远端 xDS/CA 地址>:<端口> \
  --ca-bundle-file ./ca-cert.pem \
  | kubectl --context cluster2 apply -f -
```

在远端集群创建 east-west Gateway。主控制面会通过远端 Secret 监听这个 Gateway，并在远端集群生成 dxgate 网关数据面 Deployment 和 Service。

```bash
dubboctl multicluster generate-eastwest-gateway \
  --xds-address http://<主集群可访问 ADS 地址>:<grpc-xds NodePort 或 LB 端口> \
  --service-type NodePort \
  --node-port 32443 \
  | kubectl --context cluster2 apply -f -
```

## 清理

```bash
kubectl --context cluster2 delete gateway -n dubbo-system dubbod-eastwest-gateway
kubectl --context cluster2 delete mutatingwebhookconfiguration dubbo-remote-sidecar-injector
kubectl --context cluster1 delete secret -n dubbo-system remote
```
