---
title: "Models"
hide:
- navigation
---

# Models

Clients always speak the **OpenAI wire format** to the gateway. The gateway picks a backend from the model named in the request and translates in both directions for providers with a native dialect (Anthropic, Gemini) — including turning their SSE streams back into OpenAI chat-completion chunks. Switching providers therefore costs no client change.

## Supported providers

| Provider kind | Dialect | Default base URL | Credential header |
| --- | --- | --- | --- |
| `open-ai-compatible` | OpenAI | required | `Authorization: Bearer <key>` |
| `openai` | OpenAI | `https://api.openai.com/v1` | `Authorization: Bearer <key>` |
| `deepseek` | OpenAI | `https://api.deepseek.com/v1` | `Authorization: Bearer <key>` |
| `anthropic` | Anthropic | `https://api.anthropic.com` | `x-api-key: <key>` |
| `gemini` | Gemini | `https://generativelanguage.googleapis.com/v1beta` | `x-goog-api-key: <key>` |

Anything that exposes an OpenAI-compatible API — vLLM, Ollama, a self-hosted inference gateway, another cloud vendor — connects as `open-ai-compatible` with a `base_url`; no per-vendor dialect is needed.

Two caveats:

- Native-dialect providers support only `POST /v1/chat/completions`; other `/v1/*` paths return `502`.
- A client's own `Authorization` header is never forwarded to a native-dialect provider — only the provider's configured credential is sent.

## Declaring a provider

```yaml
providers:
  - name: openai
    kind: openai
    api_key_env: OPENAI_API_KEY

  - name: claude
    kind: anthropic
    api_key_env: ANTHROPIC_API_KEY

  - name: local
    kind: open-ai-compatible
    base_url: http://vllm.svc:8000/v1
```

Keys are referenced by environment variable name and read per request — never written into the configuration file.

## Wiring a model into a route

A backend declares the provider it belongs to and the models it accepts; a route then matches on the model name:

```yaml
backends:
  - name: gpt
    type: llm
    provider: openai
    models: ["gpt-4o-mini"]

  - name: claude-sonnet
    type: llm
    provider: claude
    models: ["claude-sonnet-4-5"]

routes:
  - name: chat
    protocol: llm
    matches:
      - path: { type: exact, value: /v1/chat/completions }
        model: gpt-4o-mini
    weighted_backends:
      - { name: gpt, weight: 100 }
```

An empty `models` list means any model. On each request, backends whose list excludes the requested model are skipped; the rest are chosen by weight, and retries fail over among those remaining. That covers both common needs: splitting one model across providers, and routing different models to different backends.

## Policy on top of model traffic

Model traffic shares the policy model used for ordinary HTTP: API-key / JWT auth, fixed-window rate limits (per route, per backend, or per caller credential), timeouts, retries with failover, and header transforms. Adding models does not require a second gateway layer for governance.

For background, see [what is dxgate](../dxgate/index.md) and the [architecture](../dxgate/architecture.md).
