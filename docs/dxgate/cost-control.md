# 成本控制

流量经过 dxgate 后，Cost Control 同时记两本账：API 美元、ChatGPT 订阅 credits。不发明汇率。未知模型不计价。

看：`/ui` → Cost Control。中间是用量火焰图（K 线 + 累计山形），或 `GET /debug/cost`。

## ChatGPT 订阅（Codex）

不配 Provider key。Codex 登录 ChatGPT，profile 把请求打到 dxgate。有 `usage` 就算。

| 项 | 值 |
| --- | --- |
| Codex | `~/.codex/config.toml` |
| 启动 | `codex --profile dxgate` |
| DxgateService | `spec.ai.provider.openai: {}`，不要 `credential` |

```toml
[model_providers.dxgate]
name = "dxgate"
base_url = "http://127.0.0.1:8080/v1"
wire_api = "chat"

[profiles.dxgate]
model = "gpt-5.6-sol"
model_provider = "dxgate"
```

## API

Provider Secret 注入 API key。客户端打网关 `/v1`。

| 项 | 值 |
| --- | --- |
| Secret | `openai-secret`，键 `Authorization` |
| DxgateService | `spec.ai.provider.openai` + `credential` |
| 客户端 | `curl http://gateway/v1/chat/completions` |

```bash
kubectl -n dubbo-system create secret generic openai-secret \
  --from-literal=Authorization="$OPENAI_API_KEY"
```

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
metadata:
  name: openai
  namespace: dubbo-system
spec:
  ai:
    provider:
      openai: {}
      credential:
        name: openai-secret
        key: Authorization
    routes:
      /v1/chat/completions: COMPLETIONS
```

价目仅 GPT-5.6 Sol / Terra / Luna。LLM 路由见 [LLM](llm.md)。
