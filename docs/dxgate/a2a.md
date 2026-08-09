# A2A 转发

集群内 Agent 用 `DxgateService.spec.a2a.backendRef` 指向 Kubernetes Service；外部 Agent 可以改用 `host`。两者只能选择一个。

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
metadata:
  name: planner
spec:
  a2a:
    backendRef: {name: planner-agent}
    port: 8080
    path: /a2a
    agent: planner
```

HTTPRoute 可以用同一个 `DxgateService` 承载 `/.well-known/agent-card.json` 与 `/a2a`。完整引用写法见[统一 DxgateService API](service.md)。

## Agent Card

dxgate 把 Agent Card 中绝对 `url` 与 `additionalInterfaces[].url` 的协议和主机改成客户端访问网关时的地址，保留路径。这样不会泄露集群内地址，客户端也不会绕过网关策略。

## 任务亲和

dxgate 从 A2A JSON-RPC 请求与响应提取 task ID，把后续 `tasks/get`、`tasks/cancel`、`tasks/resubscribe` 和续接消息固定到最初处理它的后端。流式响应会边转发边识别 task ID，不必等待 SSE 结束。

## 路径

标准路径是 `/.well-known/agent-card.json`、`/a2a` 与 `/a2a/*`。需要自定义入口时使用 HTTPRoute `URLRewrite`，数据面在协议处理前执行路径替换。
