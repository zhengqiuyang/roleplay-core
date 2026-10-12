import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersona } from '../src/persona.js';
import { createSession, userTurn, personaTurn } from '../src/session.js';
import {
  isQuestion, isOpenQuestion, scoreDeterministic, scoreReport,
} from '../src/scoring.js';
import { createMockModel } from '../src/model.js';

const rubric = {
  dimensions: [
    { id: 'opening', name: '开场与破冰' },
    { id: 'objection', name: '异议应对' },
  ],
};

function playedSession() {
  const p = createPersona({
    id: 'p', name: '赵总', role: '餐饮连锁老板',
    hidden: [{ key: 'pain', value: '食材成本涨', unlockHints: ['成本'], painKeywords: ['成本', '损耗'] }],
    anchors: [{ id: 'a', atTurn: 1, content: '我很忙。' }],
  });
  const s = createSession(p, { maxTurns: 10 });
  userTurn(s, '赵总您好，最近食材成本涨得厉害吧？你们后厨损耗怎么控制的？');
  personaTurn(s, '唉别提了。你有什么办法？');
  userTurn(s, '我们的系统怎么做？下周二我带方案来给您看？');
  personaTurn(s, '行，那就下周二。');
  return s;
}

test('问句/开放问句判定', () => {
  assert.ok(isQuestion('你们预算多少？'));
  assert.ok(isQuestion('what is your budget?'));
  assert.ok(!isQuestion('我们的方案很好。'));
  assert.ok(isOpenQuestion('为什么会这样？'));
  assert.ok(isOpenQuestion('怎么解决的'));
  assert.ok(!isOpenQuestion('能便宜点吗？'));
});

test('硬指标：提问率/痛点命中/下一步', () => {
  const r = scoreDeterministic(playedSession());
  assert.equal(r.turnCount, 2);
  assert.equal(r.questionRate, 100); // 两句都是问句
  assert.ok(r.painHitRate > 0);      // 第一句命中"成本"
  assert.equal(r.nextStepMentioned, true); // "下周二/方案"
});

test('混合报告：软维度取合法值，非法值降级为 null', async () => {
  const model = createMockModel({ rubric: { opening: 88, objection: 'N/A' } });
  const report = await scoreReport(model, playedSession(), rubric);
  assert.equal(report.soft.opening, 88);
  assert.equal(report.soft.objection, null); // 非法值被丢弃
  assert.equal(report.anchorCoverage, 100);
});

test('无模型时报告仍完整（软维度为空对象）', async () => {
  const report = await scoreReport(null, playedSession(), rubric);
  assert.deepEqual(report.soft, {});
  assert.ok(report.hard.questionRate >= 0);
});
