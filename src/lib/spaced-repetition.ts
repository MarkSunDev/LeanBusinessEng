/**
 * 简化版 SM-2 间隔重复算法
 * quality: 0-5 用户自评（0-2 失败，3-5 成功）
 */
export function calculateNextReview(
  quality: number,
  repetitions: number,
  interval: number,
  easeFactor: number
): { nextReviewAt: Date; interval: number; easeFactor: number; repetitions: number } {
  let newInterval: number;
  let newRepetitions: number;
  let newEaseFactor = easeFactor;

  if (quality < 3) {
    // 回答错误，重置
    newRepetitions = 0;
    newInterval = 1;
  } else {
    newRepetitions = repetitions + 1;
    if (repetitions === 0) {
      newInterval = 1;
    } else if (repetitions === 1) {
      newInterval = 6;
    } else {
      newInterval = Math.round(interval * easeFactor);
    }
  }

  // 更新难度因子
  newEaseFactor =
    easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  if (newEaseFactor < 1.3) newEaseFactor = 1.3;

  const nextReviewAt = new Date();
  nextReviewAt.setDate(nextReviewAt.getDate() + newInterval);

  return {
    nextReviewAt,
    interval: newInterval,
    easeFactor: newEaseFactor,
    repetitions: newRepetitions,
  };
}
