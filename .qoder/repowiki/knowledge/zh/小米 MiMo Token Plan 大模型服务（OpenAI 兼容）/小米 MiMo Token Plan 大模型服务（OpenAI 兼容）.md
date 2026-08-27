---
kind: external_dependency
name: 小米 MiMo Token Plan 大模型服务（OpenAI 兼容）
slug: xiaomi-mimo-token-plan
category: external_dependency
category_hints:
    - vendor_identity
    - sdk_real_api
    - client_constraint
scope:
    - '**'
source_files:
    - configs/models.yaml
    - python/src/resolveagent/llm/openai_compat.py
    - python/src/resolveagent/llm/model_config.py
---

### 身份与角色
- 小米企业级大模型服务，通过 **Token Plan** 订阅制套餐提供推理能力（`tp-` 前缀密钥），当前项目使用中国区端点 `token-plan-cn.xiaomimimo.com/v1`。
- 作为 ResolveAgent Python Runtime 的 LLM Provider 之一，走 OpenAI 兼容协议 `/v1/chat/completions`，支持 `mimo-v2.5-pro`（旗舰推理，1M 上下文）和 `mimo-v2.5`（多模态）。

### 集成方式
- 在 `configs/models.yaml` 中以 `provider: mimo` 注册模型，通过 `base_url` 指定区域端点；`create_llm_provider` 根据 base_url 自动路由 API Key（`xiaomimimo.com` 域名使用 `XIAOMI_TOKEN_PLAN_API_KEY`，避免误发给 Moonshot/Kimi）。
- 流式响应需跳过推理阶段返回的 `choices: []` 空 chunk（MiMo 思考阶段会产生此类 chunk），已在 `openai_compat.py` 中修复。
- 原生支持项目的 `thinking={"type":"disabled"}` 参数，temperature 可任意设置。

### 关键约束
- 不同区域对应不同 base_url：`token-plan-cn` / `token-plan-sgp` / `token-plan-ams`，密钥仅匹配单一区域；sgp/ams 对 cn 密钥返回 401。
- 推理模型默认开启 thinking，可通过传入 `thinking.disabled` 关闭以消除 `reasoning_content`。