import type { Achievement, AchievementSignal } from '../types/models'

export interface AchievementEvaluation {
  achievements: Achievement[]
  unlockedIds: string[]
}

/**
 * 评估一次自动成就信号。函数不读写存储，便于未来由任务、打卡或导入流程调用。
 */
export function evaluateAchievementTriggers(
  achievements: readonly Achievement[],
  signal: AchievementSignal,
): AchievementEvaluation {
  const event = signal.event.trim()
  if (event.length === 0) {
    throw new Error('成就事件标识不能为空')
  }
  if (!Number.isFinite(signal.value)) {
    throw new Error('成就事件值必须是有限数字')
  }
  if (!Number.isFinite(Date.parse(signal.occurredAt))) {
    throw new Error('成就事件时间无效')
  }

  const unlockedIds: string[] = []
  const next = achievements.map((achievement) => {
    const trigger = achievement.trigger
    if (
      achievement.unlockType !== 'automatic' ||
      achievement.unlockedAt !== null ||
      trigger === null ||
      trigger.event !== event ||
      signal.value < trigger.threshold
    ) {
      return achievement
    }

    unlockedIds.push(achievement.id)
    return {
      ...achievement,
      unlockedAt: signal.occurredAt,
      updatedAt: signal.occurredAt,
    }
  })

  return { achievements: next, unlockedIds }
}
