// roleplay-core：多轮角色扮演对话引擎。
// 抽离自 interview-mate，pitch-mate 为第一个消费者。
// 零运行时依赖，Node >= 18，ESM。
export {
  createPersona, attemptUnlock, revealedFacts, dueAnchors, anchorCoverage,
} from './persona.js';
export {
  createSession, userTurn, personaTurn, endSession, userMessages,
} from './session.js';
export {
  isQuestion, isOpenQuestion, scoreDeterministic, scoreWithRubric, scoreReport,
} from './scoring.js';
export {
  createItem, review, isDue, dueItems, gradeFromReport,
} from './srs.js';
export { runToolLoop, createMockModel } from './model.js';
export { createOpenAICompatModel } from './openai-compat.js';
