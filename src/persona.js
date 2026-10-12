// 人设引擎：隐藏信息 + 剧本锚点。pitch-mate 的差异化核心——
// 客户知道玩家不知道的事（真实预算/真实痛点/决策链），提问才能解锁；
// 剧本锚点保证每场陪练必经的剧情节点（如"中途接到竞品报价电话"）。

const REQUIRED = ['id', 'name', 'role', 'hidden', 'anchors'];

export function createPersona(spec) {
  for (const key of REQUIRED) {
    if (!spec[key] || (Array.isArray(spec[key]) && spec[key].length === 0)) {
      throw new Error(`persona 缺少必填字段: ${key}`);
    }
  }
  return {
    difficulty: 'standard',
    stance: {},
    ...spec,
    // hidden: [{key, value, unlockHints:[关键词...], revealed:false}]
    hidden: spec.hidden.map((h) => ({ revealed: false, unlockHints: [], ...h })),
    // anchors: [{id, atTurn, content, fired:false}]  atTurn 从 1 计
    anchors: spec.anchors.map((a) => ({ fired: false, ...a })),
  };
}

// 玩家发言后，检查是否命中某条隐藏信息的解锁提示词。
// 命中即解锁——"问对了问题才能拿到真相"的机制化实现。
export function attemptUnlock(persona, userText) {
  const text = String(userText).toLowerCase();
  const newlyRevealed = [];
  for (const h of persona.hidden) {
    if (h.revealed) continue;
    if (h.unlockHints.some((hint) => text.includes(String(hint).toLowerCase()))) {
      h.revealed = true;
      newlyRevealed.push(h);
    }
  }
  return newlyRevealed;
}

// 已解锁的隐藏信息（注入模型上下文用：说真话的部分）
export function revealedFacts(persona) {
  return persona.hidden.filter((h) => h.revealed);
}

// 第 turn 轮应触发的剧本锚点（每锚点只触发一次）
export function dueAnchors(persona, turn) {
  return persona.anchors.filter((a) => !a.fired && a.atTurn <= turn).map((a) => {
    a.fired = true;
    return a;
  });
}

// 锚点覆盖率：评分维度之一（剧本必须走完，人设不能被玩家带偏）
export function anchorCoverage(persona) {
  if (persona.anchors.length === 0) return 1;
  return persona.anchors.filter((a) => a.fired).length / persona.anchors.length;
}
