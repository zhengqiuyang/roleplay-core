// 评分流水线：硬指标确定性计算 + 软维度 LLM rubric（模型可注入、可替换）。
// 分工原则（防单点幻觉）：提问率/痛点命中这类可精确判断的指标绝不用 LLM。
import { anchorCoverage } from './persona.js';

const OPEN_QUESTION_STARTERS = [
  '什么', '为什么', '怎么', '怎样', '如何', '哪', '哪些',
  'what', 'why', 'how', 'which', 'tell me about', 'walk me through',
];
const NEXT_STEP_HINTS = [
  '下次', '下一步', '再约', '约个', '跟进', '发您', '发你', '报价', '方案',
  'next step', 'follow up', 'schedule', 'send you',
];

export function isQuestion(text) {
  const t = String(text).trim();
  return t.endsWith('?') || t.endsWith('？') || /^(do|does|did|are|is|can|could|would|will|have)\b/i.test(t);
}

export function isOpenQuestion(text) {
  const t = String(text).trim().toLowerCase();
  return OPEN_QUESTION_STARTERS.some((s) => t.startsWith(s));
}

// 确定性硬指标（0-100）
export function scoreDeterministic(session) {
  const users = session.transcript.filter((m) => m.role === 'user');
  const n = users.length || 1;
  const questions = users.filter((m) => isQuestion(m.text));
  const open = users.filter((m) => isOpenQuestion(m.text));
  const painKeywords = collectPainKeywords(session.persona);
  const painHits = users.filter((m) =>
    painKeywords.some((k) => m.text.toLowerCase().includes(k.toLowerCase()))
  );

  return {
    turnCount: users.length,
    questionRate: round((questions.length / n) * 100),
    openQuestionRate: round((open.length / n) * 100),
    painHitRate: round(painKeywords.length === 0 ? 100 : (painHits.length / n) * 100),
    nextStepMentioned: users.some((m) =>
      NEXT_STEP_HINTS.some((h) => m.text.toLowerCase().includes(h.toLowerCase()))
    ),
  };
}

// 软维度：rubric 由模型评分。model 只需实现 async rubricScore(rubric, context)。
// 返回非法值（越界/缺维）时该维降级为 null——宁缺勿错，聚合层处理缺失。
export async function scoreWithRubric(model, session, rubric) {
  const dims = rubric.dimensions.map((d) => d.id);
  const raw = await model.rubricScore(rubric, {
    persona: { name: session.persona.name, role: session.persona.role },
    transcript: session.transcript,
  });
  const result = {};
  for (const id of dims) {
    const v = raw?.[id];
    result[id] = typeof v === 'number' && v >= 0 && v <= 100 ? round(v) : null;
  }
  return result;
}

// 混合报告：硬指标 + 软维度 + 锚点覆盖。LLM 缺席也能出完整报告。
export async function scoreReport(model, session, rubric) {
  return {
    hard: scoreDeterministic(session),
    soft: model ? await scoreWithRubric(model, session, rubric) : {},
    anchorCoverage: round(anchorCoverage(session.persona) * 100),
    endedReason: session.endedReason,
  };
}

function collectPainKeywords(persona) {
  const kws = [];
  for (const h of persona.hidden || []) {
    if (Array.isArray(h.painKeywords)) kws.push(...h.painKeywords);
  }
  return [...new Set(kws)];
}

function round(x) {
  return Math.round(x * 10) / 10;
}
