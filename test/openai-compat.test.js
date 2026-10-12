import test from 'node:test';
import assert from 'node:assert/strict';
import { createOpenAICompatModel } from '../src/openai-compat.js';

function fakeFetch(handler) {
  return async (url, init) => handler(url, init);
}

test('chat：正常调用拼装请求并取回 content', async () => {
  const seen = [];
  const model = createOpenAICompatModel({
    apiKey: 'test-key', model: 'test-model',
    fetchImpl: fakeFetch((url, init) => {
      seen.push({ url, body: JSON.parse(init.body), auth: init.headers.authorization });
      return Response.json({ choices: [{ message: { content: '你好，说重点。' } }] });
    }),
  });
  const out = await model.chat([{ role: 'user', content: 'hi' }]);
  assert.equal(out.content, '你好，说重点。');
  assert.equal(seen[0].url, 'https://api.openai.com/v1/chat/completions');
  assert.equal(seen[0].auth, 'Bearer test-key');
  assert.equal(seen[0].body.model, 'test-model');
  assert.equal(seen[0].body.temperature, 0);
});

test('rubricScore：JSON 提取与缺维降级 null', async () => {
  const model = createOpenAICompatModel({
    apiKey: 'k',
    fetchImpl: fakeFetch(() => Response.json({
      choices: [{ message: { content: '评分如下：```json\n{"opening": 82, "objection": "N/A"}\n```' } }],
    })),
  });
  const rubric = { dimensions: [{ id: 'opening' }, { id: 'objection' }, { id: 'closing' }] };
  const out = await model.rubricScore(rubric, { transcript: [] });
  assert.equal(out.opening, 82);
  assert.equal(out.objection, null);  // 非数值降级
  assert.equal(out.closing, null);    // 缺失降级
});

test('非 200 响应抛错并带状态码', async () => {
  const model = createOpenAICompatModel({
    apiKey: 'k',
    fetchImpl: fakeFetch(() => Response.json({ error: 'quota' }, { status: 429 })),
  });
  await assert.rejects(() => model.chat([]), /429/);
});

test('缺 API key 直接报错（不静默降级）', () => {
  delete process.env.LLM_API_KEY;
  assert.throws(() => createOpenAICompatModel({}), /API key/);
});
