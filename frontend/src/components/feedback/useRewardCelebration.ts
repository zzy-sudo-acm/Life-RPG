import { useCallback, useState } from 'react'
import type { RewardBundle } from '../../types/models'

export interface Celebration {
  title: string
  rewards: RewardBundle
  /** 结算前的角色等级，用于检测本次结算是否触发升级。 */
  baseLevel: number
}

/**
 * 任务完成庆祝浮层的状态管理。
 * 典型用法：先记录当前等级，await completeTask 成功后调用 present。
 */
export function useRewardCelebration() {
  const [celebration, setCelebration] = useState<Celebration | null>(null)

  const present = useCallback((next: Celebration) => {
    setCelebration(next)
  }, [])

  const dismiss = useCallback(() => {
    setCelebration(null)
  }, [])

  return { celebration, present, dismiss }
}
