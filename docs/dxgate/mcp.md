# MCP 路由

一个 `DxgateService.spec.mcp` 可以把多个 Kubernetes Service 联合成一个 MCP 入口：

```yaml
apiVersion: networking.dubbo.apache.org/v1alpha3
kind: DxgateService
metadata:
  name: tools
spec:
  mcp:
    targets:
      - name: search
        static:
          backendRef: {name: search-mcp}
          port: 8080
        tools: [search]
      - name: calendar
        static:
          backendRef: {name: calendar-mcp}
          port: 8080
        tools: [calendar]
```

`HTTPRoute` 用 `group: networking.dubbo.apache.org`、`kind: DxgateService` 引用 `tools`。每个 target 的 `backendRef` 是普通 Kubernetes Service。

## 运行行为

- `/mcp` 与 `/mcp/*` 按 MCP 处理。
- `initialize`、`tools/list` 等未指定工具的请求可访问全部 target。
- `tools/call` 按 `tools` 声明选择 target。
- `mcp-session-id` 把后续请求固定到首次选中的 target。
- `tools/list`、`prompts/list`、`resources/list` 与模板列表会跨 target 聚合并处理分页。
- 重名工具暴露为 `{target}__{name}`，调用时自动还原并发往对应 target。

完整的 HTTPRoute 和策略写法见[统一 DxgateService API](service.md)与[安全](security.md)。
