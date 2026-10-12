// 间隔重复调度（SM-2 简化版）：薄弱场景进复习队列。
// 复习对象是"场景×难度"而非题目——练得差的场景更早回来找你。

export function createItem(id, now = Date.now()) {
  return { id, ease: 2.5, intervalDays: 0, reps: 0, dueAt: now, lapses: 0 };
}

// grade: 0-5。<=2 视为失误：间隔清零重来，且 ease 下调（下限 1.3）。
export function review(item, grade, now = Date.now()) {
  if (!(grade >= 0 && grade <= 5)) throw new Error('grade 必须在 0-5');
  const next = { ...item };
  if (grade <= 2) {
    next.reps = 0;
    next.intervalDays = 0;
    next.lapses += 1;
    next.ease = Math.max(1.3, next.ease - 0.2);
    next.dueAt = now; // 失误：立刻可再练
    return next;
  }
  next.reps += 1;
  next.ease = Math.max(1.3, next.ease + (0.1 - (5 - grade) * 0.08 + (grade === 5 ? 0.02 : 0)));
  if (next.reps === 1) next.intervalDays = 1;
  else if (next.reps === 2) next.intervalDays = 3;
  else next.intervalDays = Math.round(next.intervalDays * next.ease);
  next.dueAt = now + next.intervalDays * 86400000;
  return next;
}

export function isDue(item, now = Date.now()) {
  return item.dueAt <= now;
}

export function dueItems(items, now = Date.now()) {
  return items
    .filter((i) => isDue(i, now))
    .sort((a, b) => a.dueAt - b.dueAt); // 最该复习的排前面
}

// 评分报告 → 复习等级的映射（scoreReport 的下游）
export function gradeFromReport(report) {
  const { hard } = report;
  const composite =
    hard.questionRate * 0.3 + hard.openQuestionRate * 0.2 +
    hard.painHitRate * 0.3 + (report.anchorCoverage ?? 100) * 0.2;
  if (composite >= 85) return 5;
  if (composite >= 70) return 4;
  if (composite >= 55) return 3;
  return 2;
}
