// OpenAI 兼容模型适配器：任何 /v1/chat/completions 端点可用（vLLM/llama-server/各云厂商兼容层）。
// fetch 可注入（测试），超时与错误显式化——生产路径不吞异常。
export function createOpenAICompatModel(options = {}) {
  const {
    baseUrl = env('LLM_BASE_URL', 'https://api.openai.com/v1'),
    apiKey = env('LLM_API_KEY', ''),
    model = env('LLM_MODEL', 'gpt-4o-mini'),
    fetchImpl = globalThis.fetch,
    timeoutMs = 30000,
  } = options;

  if (!apiKey) {
    throw new Error('缺少 API key：传 apiKey 或设置 LLM_API_KEY');
  }

  async function chat(messages, { temperature = 0, maxTokens = 1024 } = {}) {
    const res = await request('/chat/completions', {
      model, messages, temperature, max_tokens: maxTokens,
    });
    const content = res?.choices?.[0]?.message?.content;
    if (typeof content !== 'string') throw new Error('模型返回缺少 content');
    return { content, raw: res };
  }

  // rubric 评分：要求纯 JSON 输出；非数值/越界直接降级 null（适配器先做一层
  // 数值严格化，scoring.scoreWithRubric 再兜底——双层防御）
  async function rubricScore(rubric, context) {
    const dims = rubric.dimensions.map((d) => `"${d.id}" (0-100, ${d.name}: ${d.guide ?? ''})`).join('\n');
    const { content } = await chat([
      { role: 'system', content: `你是严格的评分官。只输出 JSON 对象，包含以下键：\n${dims}\n不要输出任何其他文字。` },
      { role: 'user', content: JSON.stringify(context) },
    ], { temperature: 0, maxTokens: 512 });
    const parsed = extractJson(content) ?? {};
    const out = {};
    for (const d of rubric.dimensions) {
      const v = parsed[d.id];
      out[d.id] = typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 100 ? v : null;
    }
    return out;
  }

  async function request(path, body) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetchImpl(`${baseUrl}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        const text = await res.text().catch(() => '');
        throw new Error(`LLM 端点 ${res.status}: ${text.slice(0, 200)}`);
      }
      return await res.json();
    } finally {
      clearTimeout(timer);
    }
  }

  return { name: `openai-compat:${model}`, chat, rubricScore };
}

function extractJson(text) {
  const m = String(text).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

function env(key, fallback) {
  return process.env[key] || fallback;
}
