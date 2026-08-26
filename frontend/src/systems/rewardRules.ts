import type {
  AppData,
  RewardBundle,
  StatKey,
  TaskDifficulty,
} from '../types/models'

interface DifficultyRule {
  exp: number
  stat: number
  skillExp: number
  goalProgress: number
}

export const TASK_REWARD_RULES: Record<TaskDifficulty, DifficultyRule> = {
  easy: { exp: 10, stat: 0.25, skillExp: 3, goalProgress: 5 },
  medium: { exp: 25, stat: 0.5, skillExp: 6, goalProgress: 10 },
  hard: { exp: 50, stat: 1, skillExp: 12, goalProgress: 20 },
}

const CATEGORY_STAT_HINTS: ReadonlyArray<[RegExp, StatKey]> = [
  [/运动|健身|健康|跑步|体能|睡眠/, 'health'],
  [/数学|学习|语言|英语|阅读|考试|知识/, 'intelligence'],
  [/设计|创作|写作|艺术|音乐|摄影/, 'creativity'],
  [/计算机|编程|开发|工程|技术|科研|算法/, 'technical'],
]

export function statForCategory(name: string): StatKey {
  return CATEGORY_STAT_HINTS.find(([pattern]) => pattern.test(name))?.[1] ?? 'execution'
}

/**
 * 任务奖励只有一个来源：难度决定基础值，分类决定成长方向，关联目标提供 20% EXP 加成。
 */
export function calculateTaskRewards(
  task: Pick<AppData['tasks'][number], 'categoryId' | 'difficulty' | 'goalId'>,
  data: Pick<AppData, 'skillCategories' | 'skills'>,
): RewardBundle {
  const rule = TASK_REWARD_RULES[task.difficulty]
  const category = data.skillCategories.find((item) => item.id === task.categoryId)
  const skill = data.skills.find(
    (item) => item.categoryId === task.categoryId && item.parentId === null,
  ) ?? data.skills.find((item) => item.categoryId === task.categoryId)
  const exp = task.goalId === null ? rule.exp : Math.round(rule.exp * 1.2)

  return {
    exp,
    stats: { [statForCategory(category?.name ?? '')]: rule.stat },
    skills: skill === undefined ? [] : [{ skillId: skill.id, amount: rule.skillExp }],
    goalProgress: task.goalId === null ? 0 : rule.goalProgress,
  }
}

export function inferDifficulty(exp: number): TaskDifficulty {
  if (exp >= 45) return 'hard'
  if (exp >= 20) return 'medium'
  return 'easy'
}
