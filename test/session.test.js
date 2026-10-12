import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersona } from '../src/persona.js';
import { createSession, userTurn, personaTurn, endSession } from '../src/session.js';

const persona = () => createPersona({
  id: 'p1',
  name: '李经理',
  role: '连锁美甲店老板',
  hidden: [{ key: 'truePain', value: '员工流动率高', unlockHints: ['员工'] }],
  anchors: [{ id: 'a1', atTurn: 2, content: '我现在很忙，长话短说。' }],
});

test('完整一轮：用户发言→解锁→锚点→客户回复', () => {
  const s = createSession(persona());
  const e1 = userTurn(s, '您好，想了解下店里员工管理上有什么困扰？');
  assert.equal(e1.unlocked.length, 1);
  personaTurn(s, '唉，招人难留人更难……你说你能怎么帮？');
  const e2 = userTurn(s, '我们帮您把排班自动化。');
  assert.equal(e2.anchors.length, 1); // turn2 锚点触发
  personaTurn(s, '我现在很忙，长话短说。');
  assert.equal(s.state, 'running');
});

test('超过 maxTurns 自动结束，之后发言报错', () => {
  const s = createSession(persona(), { maxTurns: 2 });
  userTurn(s, '你好');
  personaTurn(s, '说重点。');
  userTurn(s, '我们的方案是……');
  assert.equal(s.state, 'ended_max_turns');
  assert.throws(() => userTurn(s, '还有吗'));
});

test('endSession 幂等', () => {
  const s = createSession(persona());
  endSession(s, 'ended_normal');
  endSession(s, 'ended_max_turns');
  assert.equal(s.state, 'ended_normal');
});
