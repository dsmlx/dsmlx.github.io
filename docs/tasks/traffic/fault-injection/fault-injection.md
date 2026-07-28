# 故障注入

本任务使用 `FaultInjectionPolicy` 为 Kubernetes `Service` 注入可控延迟和中止故障，用于验证超时、重试、降级与告警行为。

## 前提

安装或升级 Dubbo CRD 后，确认集群已识别策略：

```shell
kubectl explain faultinjectionpolicy.spec
kubectl explain faultinjectionpolicy.spec.delay
kubectl explain faultinjectionpolicy.spec.abort
```

准备示例服务：

```shell
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```

## 配置

下面的策略附着到 `httpbin` Service。20% 的请求或连接会先延迟 250 毫秒，10% 会在到达应用前中止。延迟和中止独立抽样；同一次调用同时命中时，先延迟再中止。

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: FaultInjectionPolicy
metadata:
  name: httpbin-fault-injection
spec:
  targetRefs:
  - group: ""
    kind: Service
    name: httpbin
  delay:
    fixedDelay: 250ms
    percentage: 20
  abort:
    httpStatus: 503
    percentage: 10
```

应用策略：

```shell
kubectl apply -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/fault-injection.yaml
kubectl get faultinjectionpolicy httpbin-fault-injection -o yaml
```

`targetRefs[].sectionName` 可以指定 Service 端口名；省略时策略作用于该 Service 的全部端口。同一目标存在多个策略时，控制面采用创建时间最早的有效策略，端口级策略优先于 Service 级策略。

## 验证 Proxyless 出站

把 dubbod 的测试入口转发到本地：

```shell
kubectl -n dubbo-system port-forward deploy/dubbod 17171:17171
```

从另一个终端发送多次真实请求：

```shell
grpcurl -plaintext \
  -d '{"url":"xds:///httpbin.default.svc.cluster.local:80","path":"/get","count":50}' \
  :17171 proto.XDSTestService/ForwardHTTP
```

命中延迟时，调用至少增加 250 毫秒；命中中止时，客户端返回 `fault injected HTTP status 503`，且不会访问上游。故障在重试逻辑之前执行，因此本地注入的中止不会被自动重试。

## 入站 dxplane 语义

控制面也会把同一策略写入目标工作负载的 dxplane runtime 配置。dxplane 在建立到本地应用的连接前执行故障：

- 延迟会暂停选中的入站连接，并增加 `dxplane_fault_delays_total`。
- 中止会直接关闭选中的连接，并增加 `dxplane_fault_aborts_total`。
- dxplane 是 L4 数据面，不终止 HTTP/gRPC 协议，因此不能合成配置的 HTTP 状态码；`httpStatus` 只用于配置校验与 L7 Proxyless 出站返回。

## 参数规则

- `delay` 与 `abort` 至少配置一个。
- `fixedDelay` 必须至少为 1 毫秒。
- `httpStatus` 必须在 400 到 599 之间。
- `percentage` 范围为 0 到 100；省略表示 100%，显式设为 0 表示禁用该项。
- 当前策略目标仅支持同命名空间的 Kubernetes `Service`。

## 清理

```shell
kubectl delete faultinjectionpolicy httpbin-fault-injection
kubectl delete -f https://raw.githubusercontent.com/apache/dubbo-kubernetes/master/samples/httpbin/httpbin.yaml
```
