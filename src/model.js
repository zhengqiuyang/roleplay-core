// ChatModel 抽象 + MockModel + 提示词工具协议执行器。
// 协议与 interview-mate 一致：不绑厂商 function calling，
// 模型在回复中输出 JSON 工具调用块，由本层解析执行——任何 OpenAI 兼容端点可跑。

// ---- 工具协议执行器 ----

const TOOL_BLOCK = /```tool-call\n([\s\S]*?)```/;

// 注册工具 {name: async (args) => result}，最多循环 maxLoops 次。
export async function runToolLoop(model, messages, tools, maxLoops = 4) {
  let current = messages;
  for (let i = 0; i < maxLoops; i++) {
    const reply = await model.chat(current);
    const match = typeof reply.content === 'string' ? reply.content.match(TOOL_BLOCK) : null;
    if (!match) return reply; // 普通回复，结束
    let call;
    try {
      call = JSON.parse(match[1]);
    } catch {
      return { ...reply, protocolError: 'tool-call JSON 解析失败' };
    }
    const fn = tools[call.tool];
    if (!fn) return { ...reply, protocolError: `未注册工具: ${call.tool}` };
    const result = await fn(call.args ?? {});
    current = [
      ...current,
      { role: 'assistant', content: reply.content },
      { role: 'tool', content: JSON.stringify({ tool: call.tool, result }) },
    ];
  }
  throw new Error(`工具循环超过 ${maxLoops} 次，疑似死循环`);
}

// ---- MockModel：测试与本地演示用 ----

export function createMockModel({ replies = [], rubric = {} } = {}) {
  let cursor = 0;
  return {
    name: 'mock',
    async chat(messages) {
      const content = replies[Math.min(cursor, replies.length - 1)] ?? '(沉默)';
      cursor += 1;
      return { content, messagesSeen: messages.length };
    },
    async rubricScore(rubricSpec) {
      // 按 rubric 维度返回预设分，未预设的维返回非法值（触发降级路径）
      const out = {};
      for (const d of rubricSpec.dimensions) out[d.id] = rubric[d.id] ?? 'N/A';
      return out;
    },
  };
}
