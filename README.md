# roleplay-core
[![CI](https://github.com/zhengqiuyang/roleplay-core/actions/workflows/ci.yml/badge.svg)](https://github.com/zhengqiuyang/roleplay-core/actions/workflows/ci.yml) [![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)

多轮角色扮演对话引擎——interview-mate 的核心抽离为独立包，pitch-mate 为第一个消费者。

## 能力

| 模块 | 说明 |
|---|---|
| persona | 人设引擎：隐藏信息（提问解锁）+ 剧本锚点（按轮触发，只触发一次） |
| session | 会话状态机：running → ended_normal / ended_max_turns |
| scoring | 混合评分：提问率/痛点命中/下一步等**确定性硬指标** + LLM rubric 软维度（非法值降级为 null，宁缺勿错） |
| srs | 间隔重复（SM-2 简化）：薄弱场景更早回来复训 |
| model | ChatModel 抽象 + MockModel + 提示词工具协议执行器（不绑厂商 function calling，任何 OpenAI 兼容端点可跑） |

零运行时依赖，Node ≥ 18，ESM。

## 用法

```js
import { createPersona, createSession, userTurn, personaTurn, scoreReport, createMockModel } from 'roleplay-core';

const persona = createPersona({
  id: 'wang', name: '王总', role: '采购总监',
  hidden: [{ key: 'realBudget', value: '80万', unlockHints: ['预算'] }],
  anchors: [{ id: 'competitor', atTurn: 3, content: '别家便宜30%' }],
});
const session = createSession(persona);
const events = userTurn(session, '您预算范围是多少？'); // events.unlocked 命中
personaTurn(session, '也就50万吧……你先说说方案。');
const report = await scoreReport(null, session, rubric); // 无模型也有完整硬指标报告
```

## 状态

v0.1.0 · 测试全绿（persona/session/scoring/srs/model 五组）。
Wave 0 交付物之一，见 [portfolio-roadmap](../portfolio-roadmap.md)。
