# 公告栏

选择发布公告、安全公告或支持公告，即可了解最新信息。

=== "发布公告"

    ## 0.4.x

    ### 0.4.4

    发布日期：2026-07-22

    - 优化工程文件并规范工程实践
    - 补充测试覆盖率与性能测试
    - 新增协作治理模块，完善质量门禁与维护者审批流程
    - 修复控制平面已知问题
    - 新增探针注入功能
    - 修复并优化构建与发布流程

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.4.4)

    ---

    ### 0.4.3

    发布日期：2026-07-22

    - 更新测试工具并修复 CNI 已知问题
    - 新增 Telemetry API
    - 新增 ServiceEntry 服务注册能力
    - 更新 CI 基础设施
    - 更新 dubbod GUI

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.4.3)

    ---

    ### 0.4.2

    发布日期：2026-06-30

    - 完善 Delta xDS 框架
    - 新增流量治理超时与熔断能力
    - 新增出口流量能力
    - 完善可观测性能力
    - 增强 KRT 相关能力

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.4.2)

    ---

    ### 0.4.1

    发布日期：2026-06-19

    - 新增多集群功能
    - 新增微服务示例
    - 新增 mesh CNI
    - 修复并优化已知问题

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.4.1)

    ---

    ### 0.4.0

    发布日期：2026-05-17

    - 新增流量治理相关能力
    - 新增安全基础设施能力
    - dubboctl 新增子命令
    - 修复已知问题

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.4.0)

    ---

    ## 0.3.x
    
    ### 0.3.9

    发布日期：2026-04-29

    - 修复已知 GUI 问题
    - 重命名部分核心内容
    - 新增可观测性工具与指标数据
    - 补充相关 e2e 测试

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.9)

    ---

    ### 0.3.8

    发布日期：2026-04-29

    - 修复 KRT（Kubernetes Runtime）已知问题
    - 修复 Proxyless gRPC 已知问题
    - 修复 XDS 已知问题
    - 补全 Helm 模板缺失内容及其他问题
    - 新增负载测试与 e2e 测试
    - 新增和修改相关内容

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.8)

    ---

    ### 0.3.7

    发布日期：2026-04-29

    - 将侵入式应用设计重构为非侵入式进程设计
    - 修改相关架构代码逻辑
    - 更新相关核心内容
    - 移除 dubbo-go-pixiu 委托网关

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.7)

    ---

    ### 0.3.6

    发布日期：2026-03-22

    - 移除 Envoy go-control-plane 依赖，改用 xDS API
    - 新增 xDS 指标
    - 移除 dubboctl seek 子命令
    - 更新描述与内容

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.6)

    ---

    ### 0.3.5

    发布日期：2026-02-11

    - 修复流量网关请求中的 502 错误
    - 移除 samples 目录中的部分示例，新增 httpbin 示例
    - 优化部分已知功能

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.5)

    ---

    ### 0.3.4

    发布日期：2026-02-03

    - 清理冗余代码逻辑
    - 将手动添加核心资源改为自动生成核心资源

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.4)

    ---

    ### 0.3.3

    发布日期：2026-01-25

    - 迁移 Zookeeper、Nacos、Admin Helm Chart 到目标仓库
    - 将 Planet 核心组件重命名为 Dubbo
    - 移除 Dubboctl 中的部分组件，更新 Operator 组件定义
    - 更新 README 描述，优化部分已知代码逻辑

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.3)

    ---

    ### 0.3.2

    发布日期：2026-01-20

    - 将所有 Istio API 库替换为 Dubbo API 库
    - 将部分手动维护文件改为生成器自动生成
    - 优化相关代码逻辑

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.2)

    ---

    ### 0.3.1

    发布日期：2025-12-22

    - dubbo-agent 增加基于 Gateway API 的南北向流量支持

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.1)

    ---

    ### 0.3.0

    发布日期：2025-12-01

    - 新增 Dubbo daemon
    - 新增 dubbod 负载测试
    - 新增 sample grpc-app
    - 新增 test grpc-app

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/0.3.0)

    ---

    ## 0.2.x

    ### v0.2.2

    发布日期：2025-07-30

    - dubboctl seek 支持 ChatGPT 大模型
    - 移除 dubbo admin 迁移遗留代码

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/v0.2.2)

    ---

    ### v0.2.0

    发布日期：2025-07-22

    - dubboctl 新增 seek 命令
    - dubboctl image 支持镜像信息选项
    - dubboctl deploy 支持镜像信息、命名空间和服务端口选项
    - dubboctl image push 自动获取 Docker 登录凭证
    - 更新 README 内容和项目标签
    - 迁移 admin-cp 到 dubbo-admin 项目

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/v0.2.0)

    ---

    ## 0.1.x

    ### v0.1.4

    发布日期：2025-07-16

    - dubboctl 新增 version 命令

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/v0.1.4)

    ---

    ### v0.1.3

    发布日期：2025-07-11

    - 修复 dubbo-cp 服务流量无对应 endpoint 的问题

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/v0.1.3)

    ---

    ### v0.1.2

    发布日期：2025-07-04

    - 更新 release-0.1.2

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/v0.1.2)

    ---

    ### v0.1.1

    发布日期：2025-06-02

    - 修复 Windows 兼容格式的压缩文件问题

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/v0.1.1)

    ---

    ### v0.1.0

    发布日期：2025-06-02

    - 首个预发布版本

    [查看 GitHub Release](https://github.com/apache/dubbo-kubernetes/releases/tag/v0.1.0)

=== "安全公告"

    即将推出

=== "支持公告"

    | 版本 | 发布日期 | 停止支持日期 | 状态 |
    |------|----------|-------------|------|
    | 0.4.x | 2026-05-17 | 待定 | 活跃 |
    | 0.3.x | 2025-12-01 | 2026-05-17 | 已废弃 |
    | 0.2.x | 2025-07-22 | 2025-12-01 | 已废弃 |
    | 0.1.x | 2025-06-02 | 2025-07-22 | 已废弃 |

    ### 0.4.x 支持说明

    - 发布日期：2026-05-17
    - 停止支持日期：待定
    - 状态：活跃

    **支持范围**

    - 流量治理相关能力
    - 多集群功能
    - 微服务示例
    - mesh CNI
    - 安全基础设施能力
    - dubboctl 新增子命令
    - 已知问题修复与优化

    如需了解更多支持信息，请访问 [GitHub Discussions](https://github.com/apache/dubbo-kubernetes/discussions)。
