# 多集群

本指南用于安装和使用主从跨网多集群。主集群运行 Dubbo 控制平面，远端集群通过 Secret 接入主控制面；跨集群流量通过每个集群的 east-west dxgate 转发，不直连远端 Pod IP。

## 拓扑

```text
cluster1 主集群：dubbod + 本地工作负载 + east-west dxgate
cluster2 远端集群：远端注入 webhook + 远端工作负载 + east-west dxgate
```

主控制面会监听远端集群的 Service、Endpoint 和 Gateway。EDS 下发时，本集群 Endpoint 保持 Pod IP，远端 Endpoint 会改写成对应集群的 east-west gateway 地址。

## 前提

1. 主集群 API Server 能访问远端集群 API Server。
2. 两个集群共享同一信任根。
3. 两个集群都已安装 Gateway API CRD。
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

`values.global.multicluster.eastWestGateway.gateways` 会写入 `dubbod` 的 `DUBBO_EASTWEST_GATEWAYS` 环境变量。远端集群的 Endpoint 会通过这个表映射到 east-west gateway。

## 接入远端集群

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

在远端集群创建 east-west Gateway。主控制面会通过远端 Secret 监听这个 Gateway，并在远端集群生成 `dxgate` Deployment 和 Service。

```bash
dubboctl multicluster generate-eastwest-gateway \
  --xds-address http://<主集群可访问 ADS 地址>:<grpc-xds NodePort 或 LB 端口> \
  --service-type NodePort \
  --node-port 32443 \
  | kubectl --context cluster2 apply -f -
```

## 部署样例

在两个集群部署同名服务：

```bash
for ctx in cluster1 cluster2; do
  kubectl --context "${ctx}" create ns app --dry-run=client -o yaml \
    | kubectl --context "${ctx}" apply -f -
  kubectl --context "${ctx}" label namespace app dubbo-injection=enabled --overwrite
  kubectl --context "${ctx}" apply -f samples/app/deployment.yaml
done
```

让两个集群分别承载不同版本：

```bash
kubectl --context cluster1 -n app scale deploy/nginx-v2 --replicas=0
kubectl --context cluster2 -n app scale deploy/nginx-v1 --replicas=0
kubectl --context cluster1 apply -f samples/app/meshservice.yaml
kubectl --context cluster1 apply -f samples/multicluster/eastwest-nginx-httproute.yaml
```

`HTTPRoute` 只需要放在主控制面的配置源里。远端 `dxgate` 连接主控制面 ADS 后会拿到同一份路由配置，并把流量转给远端本地 `nginx` Service。

## 验证

确认远端 Pod 注入了远端集群 ID：

```bash
kubectl --context cluster2 -n app get pod -l app=nginx-consumer \
  -o jsonpath='{.items[0].spec.containers[0].env[?(@.name=="DUBBO_META_CLUSTER_ID")].value}{"\n"}'
```

从两个集群分别访问同一个服务：

```bash
kubectl --context cluster1 -n app exec deploy/nginx-consumer -- \
  dubbod xclient --print-route --expect v1=50,v2=50

kubectl --context cluster2 -n app exec deploy/nginx-consumer -- \
  dubbod xclient --print-route --expect v1=50,v2=50
```

跨网模式下，`--print-route` 里的远端 Endpoint 应显示 east-west gateway 地址，而不是远端 Pod IP。

## 清理

```bash
kubectl --context cluster2 delete gateway -n dubbo-system dubbod-eastwest-gateway
kubectl --context cluster2 delete mutatingwebhookconfiguration dubbo-remote-sidecar-injector
kubectl --context cluster1 delete secret -n dubbo-system remote
```
