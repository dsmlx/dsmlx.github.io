# What is dxgate

dxgate is the delegated gateway for Dubbo Gateway API traffic and the external data-plane proxy of the [Apache Dubbo Kubernetes](https://github.com/apache/dubbo-kubernetes) project. As an xDS client it consumes the complete HTTP, LLM, MCP, and A2A runtime configuration from `dubbod`.

Ordinary applications and AI workloads share that one Gateway API and xDS path. Core Kubernetes `Service` represents ordinary backends; the mesh-native `DxgateService` represents OpenAI, Anthropic, MCP, and A2A backends.

## The problem it solves

Bringing AI workloads into a mesh usually produces two edges: one for application services, one for models and agents. Two edges mean two sets of certificates, two rate-limit configurations, and two definitions of what a metric means. dxgate collapses them into one data plane:

- applications and AI agents enter through the same gateway process;
- `dubbod` compiles core Services and `DxgateService` objects into one RDS configuration delivered over xDS;
- authentication, rate limiting, retries, timeouts, and header rewrites are declared once and apply to both.

## Traffic it carries

| Traffic | Matched on | Notes |
| --- | --- | --- |
| HTTP | host, path, header | Weighted clusters; `prefix` and `exact` path matching |
| gRPC / Dubbo Triple | `content-type` | End-to-end HTTP/2 with streaming bodies and trailer propagation |
| LLM | `/v1/*` paths and the request body's `model` | OpenAI-compatible wire format; SSE responses stream through untouched |
| MCP | `mcp-session-id` and tool name | Sessions stick to a backend; `tools/list` is federated across backends |
| A2A | Agent Card and A2A endpoints | Forwarded by `agent` name |

## Relationship to the mesh

dxgate sits at the cluster edge and handles only the hop in and out; service-to-service calls inside the cluster stay with the mesh. The edge and the mesh share one declarative model but keep separate failure domains — reloading gateway configuration does not disturb established in-mesh connections.

Next, read [Gateway architecture](architecture.md) and the [unified DxgateService API](service.md). Backend guides: [ordinary Kubernetes Services](http-service.md), [LLM routing](llm.md), [MCP routing](mcp.md), and [A2A forwarding](a2a.md).
