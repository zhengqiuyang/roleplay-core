// 会话状态机：一场陪练的生命周期。
// states: running -> ended_normal | ended_max_turns
import { attemptUnlock, dueAnchors } from './persona.js';

const MAX_TURNS_DEFAULT = 24;

export function createSession(persona, options = {}) {
  return {
    persona,
    state: 'running',
    turn: 0,
    maxTurns: options.maxTurns ?? MAX_TURNS_DEFAULT,
    transcript: [], // {role:'user'|'persona', text, turn}
    endedReason: null,
  };
}

// 玩家发言 → 尝试解锁隐藏信息 → 触发到期锚点。
// 返回本轮事件，由调用方注入模型上下文（"你现在可以说出的真相"/"本轮剧情节点"）。
export function userTurn(session, text) {
  assertRunning(session);
  session.turn += 1;
  session.transcript.push({ role: 'user', text, turn: session.turn });
  const events = {
    unlocked: attemptUnlock(session.persona, text),
    anchors: dueAnchors(session.persona, session.turn),
  };
  if (session.turn >= session.maxTurns) {
    endSession(session, 'ended_max_turns');
  }
  return events;
}

// AI 客户回复（锚点内容已由调用方融入文本）→ 记录。
export function personaTurn(session, text) {
  assertRunning(session);
  session.transcript.push({ role: 'persona', text, turn: session.turn });
}

export function endSession(session, reason = 'ended_normal') {
  if (session.state === 'running') {
    session.state = reason;
    session.endedReason = reason;
  }
}

export function userMessages(session) {
  return session.transcript.filter((m) => m.role === 'user');
}

function assertRunning(session) {
  if (session.state !== 'running') {
    throw new Error(`会话已结束(${session.state})，不能再继续`);
  }
}
