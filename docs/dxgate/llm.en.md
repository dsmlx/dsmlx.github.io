# LLM routing

Clients always use the OpenAI format. `DxgateService.spec.ai.provider` selects OpenAI or Anthropic, and dxgate translates both directions when needed.

## Configuration

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

Point `HTTPRoute.backendRefs` at this object. A custom public path can use the standard Gateway API `URLRewrite` filter to restore `/v1`:

```yaml
backendRefs:
  - group: networking.dubbo.apache.org
    kind: DxgateService
    name: chat
```

See [the unified DxgateService API](service.md) for the complete object.

## Models and dialects

An empty `models` list accepts any model. `modelRewrites` changes a client alias to the upstream model after backend selection.

OpenAI backends receive OpenAI requests. Anthropic backends receive native `/v1/messages` requests; responses and SSE events are translated back to OpenAI chat completions. `usage.input_tokens` and `output_tokens` become `prompt_tokens` and `completion_tokens` for metrics and token limits.

## Credentials

The API and RDS carry only a Secret reference. The dxgate ServiceAccount can read only referenced Secrets in its namespace. OpenAI gets `Authorization: Bearer <key>`; Anthropic gets `x-api-key` plus the default `anthropic-version`.

## Paths

Standard paths include `/v1/chat/completions`, `/v1/completions`, `/v1/embeddings`, `/v1/models`, and `/v1/responses`. A custom HTTPRoute path runs `ReplacePrefixMatch` before entering the same protocol handler.
