---
title: "模型"
hide:
- navigation
---

# 模型

客户端始终以 **OpenAI 报文格式**与网关对话。网关按请求中的模型名选择后端，对使用原生方言的提供方（Anthropic、Gemini）在出入方向做协议转换——包括把 SSE 流转换回 OpenAI 的 chat-completion 分块。这样，切换提供方不需要改客户端。

## 支持的提供方

| 提供方类型 | 报文方言 | 默认地址 | 凭据请求头 |
| --- | --- | --- | --- |
| `open-ai-compatible` | OpenAI | 必填 | `Authorization: Bearer <key>` |
| `openai` | OpenAI | `https://api.openai.com/v1` | `Authorization: Bearer <key>` |
| `deepseek` | OpenAI | `https://api.deepseek.com/v1` | `Authorization: Bearer <key>` |
| `anthropic` | Anthropic | `https://api.anthropic.com` | `x-api-key: <key>` |
| `gemini` | Gemini | `https://generativelanguage.googleapis.com/v1beta` | `x-goog-api-key: <key>` |

任何暴露 OpenAI 兼容接口的服务——vLLM、Ollama、自建推理网关、其他云厂商——都用 `open-ai-compatible` 接入，填上 `base_url` 即可，不需要为它单独实现方言。

两点注意：

- 使用原生方言的提供方只支持 `POST /v1/chat/completions`，其余 `/v1/*` 路径返回 `502`。
- 客户端自带的 `Authorization` 请求头不会转发给原生方言提供方，只发送该提供方配置的凭据。

## 声明一个提供方

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

密钥通过环境变量名引用，按请求读取，不写进配置文件。

## 把模型接到路由上

后端声明它归属哪个提供方，以及允许哪些模型；路由再按模型名匹配：

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

`models` 为空表示不限制模型。请求到达时，模型名不在允许列表内的后端会被跳过；剩余后端按权重选择，重试则在剩余后端之间故障转移。这套机制同时覆盖两类常见需求：把同一模型分流到多个提供方，以及按模型名把流量路由到不同后端。

## 流量之上的策略

模型流量与普通 HTTP 流量共用同一套策略模型：API Key / JWT 认证、固定窗口限流（按路由、按后端或按调用方凭据）、超时、重试与故障转移、请求头改写。也就是说，模型接入不需要另建一层网关来做治理。

更多背景见[dxgate 是什么](../dxgate/index.md) 与[网关架构](../dxgate/architecture.md)。
