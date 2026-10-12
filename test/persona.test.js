import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersona, attemptUnlock, dueAnchors, anchorCoverage } from '../src/persona.js';

const persona = () => createPersona({
  id: 'p1',
  name: '王总',
  role: '制造企业采购总监',
  hidden: [
    { key: 'realBudget', value: '预算其实有 80 万，嘴上说 50 万', unlockHints: ['预算', '预算范围'], painKeywords: ['交付延期'] },
    { key: 'truePain', value: '上家供应商交付延期害他被老板骂', unlockHints: ['上次', '之前', '踩过什么坑'] },
  ],
  anchors: [
    { id: 'competitor-call', atTurn: 3, content: '（接了个电话）刚接到电话，别家报价比你低 30%。' },
    { id: 'budget-pressure', atTurn: 6, content: '财务说这个季度要砍预算。' },
  ],
});

test('缺必填字段报错', () => {
  assert.throws(() => createPersona({ id: 'x', name: 'y' }));
});

test('命中提示词才解锁隐藏信息，且只解锁一次', () => {
  const p = persona();
  const first = attemptUnlock(p, '您这边的预算范围大概是多少？');
  assert.equal(first.length, 1);
  assert.equal(first[0].key, 'realBudget');
  const again = attemptUnlock(p, '预算到底是多少？');
  assert.equal(again.length, 0); // 已解锁不重复
});

test('锚点按轮次触发且只触发一次', () => {
  const p = persona();
  dueAnchors(p, 1); // turn1 无锚点
  dueAnchors(p, 2);
  const t3 = dueAnchors(p, 3);
  assert.equal(t3.length, 1);
  assert.equal(t3[0].id, 'competitor-call');
  const t4 = dueAnchors(p, 4);
  assert.equal(t4.length, 0); // 已触发不重复
  dueAnchors(p, 6);
  assert.equal(anchorCoverage(p), 1);
});
