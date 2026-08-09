# LLM 路由

客户端始终使用 OpenAI 格式。`DxgateService.spec.ai.provider` 选择 OpenAI 或 Anthropic，dxgate 在需要时做双向方言转换。

## 配置

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
metadata:
  name: chat
spec:
  ai:
    endpoint: https://api.anthropic.com
    provider:
      anthropic:
        model: claude-sonnet-4
      credential:
        name: anthropic-key
        key: token
    models: [claude-sonnet-4]
    modelRewrites:
      claude: claude-sonnet-4
    routes:
      /v1/chat/completions: COMPLETIONS
```

用 `HTTPRoute.backendRefs` 指向这个对象。自定义入口路径可以用标准 Gateway API `URLRewrite` 改回 `/v1`：

```yaml
backendRefs:
  - group: networking.dubbo.apache.org
    kind: DxgateService
    name: chat
```

完整对象见[统一 DxgateService API](service.md)。

## 模型与方言

`models` 为空表示接受任意模型。`modelRewrites` 在后端选择后把客户端别名改成上游模型名。

OpenAI 后端收到 OpenAI 请求；Anthropic 后端收到 `/v1/messages` 原生请求，响应和 SSE 事件再转成 OpenAI chat-completion。`usage.input_tokens` / `output_tokens` 会映射成 `prompt_tokens` / `completion_tokens`，供指标和 Token 限额使用。

## 凭据

配置和 RDS 只携带 Secret 引用。dxgate 的 ServiceAccount 只能读取自己命名空间中被引用的 Secret；OpenAI 注入 `Authorization: Bearer <key>`，Anthropic 注入 `x-api-key` 并自动补 `anthropic-version`。

## 支持路径

标准路径包括 `/v1/chat/completions`、`/v1/completions`、`/v1/embeddings`、`/v1/models` 与 `/v1/responses`。HTTPRoute 自定义路径在匹配后先执行 `ReplacePrefixMatch`，再进入相同协议处理。
