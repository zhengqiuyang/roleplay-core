import test from 'node:test';
import assert from 'node:assert/strict';
import { createItem, review, dueItems, gradeFromReport } from '../src/srs.js';

const DAY = 86400000;

test('首次通过：1 天后到期', () => {
  const t0 = 1000000;
  const item = review(createItem('s1', t0), 4, t0);
  assert.equal(item.intervalDays, 1);
  assert.equal(item.dueAt, t0 + DAY);
});

test('连续通过：间隔按 ease 扩大', () => {
  const t0 = 0;
  let item = review(createItem('s1', t0), 4, t0); // reps=1, 1d
  item = review(item, 4, t0 + DAY);               // reps=2, 3d
  item = review(item, 4, t0 + 4 * DAY);           // reps=3, 3*ease
  assert.ok(item.intervalDays >= 6, `interval=${item.intervalDays}`);
});

test('失误：清零重来且立即到期', () => {
  const t0 = 0;
  let item = review(createItem('s1', t0), 4, t0);
  item = review(item, 1, t0 + DAY);
  assert.equal(item.reps, 0);
  assert.equal(item.dueAt, t0 + DAY); // 立刻
  assert.equal(item.lapses, 1);
  assert.ok(item.ease < 2.5);
});

test('dueItems 排序：最久到期的在前', () => {
  const now = 5000000;
  const a = { id: 'a', dueAt: now - 100 };
  const b = { id: 'b', dueAt: now - 500 };
  const c = { id: 'c', dueAt: now + 100 };
  assert.deepEqual(dueItems([a, c, b], now).map((i) => i.id), ['b', 'a']);
});

test('grade 边界非法值报错', () => {
  assert.throws(() => review(createItem('x'), 6));
});

test('报告分数映射到复习等级', () => {
  const good = { hard: { questionRate: 90, openQuestionRate: 85, painHitRate: 88 }, anchorCoverage: 95 };
  const bad = { hard: { questionRate: 30, openQuestionRate: 20, painHitRate: 40 }, anchorCoverage: 50 };
  assert.equal(gradeFromReport(good), 5);
  assert.ok(gradeFromReport(bad) <= 2);
});
