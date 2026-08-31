# Cost control

After traffic hits dxgate, Cost Control writes two ledgers: API USD and ChatGPT subscription credits. No invented FX. Unknown models are not priced.

See `/ui` → Cost Control. The middle pane is a usage flame tape (candles + cumulative mountain), or `GET /debug/cost`.

## ChatGPT subscription (Codex)

Do not set a provider key. Codex stays on ChatGPT login; a profile sends requests to dxgate. Any `usage` is quoted.

| Item | Value |
| --- | --- |
| Codex | `~/.codex/config.toml` |
| Start | `codex --profile dxgate` |
| DxgateService | `spec.ai.provider.openai: {}`, no `credential` |

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

A provider Secret injects the API key. Clients call the gateway `/v1`.

| Item | Value |
| --- | --- |
| Secret | `openai-secret`, key `Authorization` |
| DxgateService | `spec.ai.provider.openai` plus `credential` |
| Client | `curl http://gateway/v1/chat/completions` |

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

The rate card is GPT-5.6 Sol / Terra / Luna only. See [LLM routing](llm.md).
