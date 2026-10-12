import test from 'node:test';
import assert from 'node:assert/strict';
import { runToolLoop, createMockModel } from '../src/model.js';

test('普通回复直接返回（无工具块）', async () => {
  const model = createMockModel({ replies: ['您好，我是王总，说重点。'] });
  const out = await runToolLoop(model, [{ role: 'user', content: '你好' }], {});
  assert.equal(out.content, '您好，我是王总，说重点。');
});

test('工具调用：解析→执行→回填→追问', async () => {
  const model = createMockModel({
    replies: [
      '```tool-call\n{"tool":"check_calendar","args":{"date":"2026-10-20"}}\n```',
      '周四晚上 7 点可以，4 位对吗？',
    ],
  });
  const calls = [];
  const out = await runToolLoop(model, [{ role: 'user', content: '订周四 7 点 4 位' }], {
    check_calendar: async (args) => {
      calls.push(args);
      return { available: true, slots: ['19:00'] };
    },
  });
  assert.deepEqual(calls, [{ date: '2026-10-20' }]);
  assert.equal(out.content, '周四晚上 7 点可以，4 位对吗？');
});

test('未注册工具：返回 protocolError 而非崩溃', async () => {
  const model = createMockModel({ replies: ['```tool-call\n{"tool":"ghost"}\n```'] });
  const out = await runToolLoop(model, [], {});
  assert.match(out.protocolError, /未注册工具/);
});

test('死循环保护', async () => {
  const model = createMockModel({ replies: ['```tool-call\n{"tool":"ping"}\n```'] });
  await assert.rejects(
    runToolLoop(model, [], { ping: async () => 'pong' }, 3),
    /死循环/
  );
});
