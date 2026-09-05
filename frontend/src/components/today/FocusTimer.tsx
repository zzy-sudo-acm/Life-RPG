import { Leaf, Pause, Play, RotateCcw } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '../ui/Button'

const STORAGE_KEY = 'life-rpg:focus:v1'
interface FocusState {
  duration: number
  remaining: number
  deadline: number | null
}
function initialState(): FocusState {
  const fallback = { duration: 25, remaining: 1500, deadline: null }
  try {
    const parsed: unknown = JSON.parse(
      localStorage.getItem(STORAGE_KEY) ?? 'null',
    )
    if (!parsed || typeof parsed !== 'object') return fallback
    const value = parsed as FocusState
    if (
      ![15, 25, 45].includes(value.duration) ||
      !Number.isFinite(value.remaining) ||
      value.remaining < 0 ||
      value.remaining > value.duration * 60 ||
      (value.deadline !== null &&
        (!Number.isFinite(value.deadline) ||
          value.deadline > Date.now() + value.duration * 60_000))
    )
      return fallback
    return value
  } catch {
    return fallback
  }
}
export function FocusTimer() {
  const [session, setSession] = useState(initialState)
  const [now, setNow] = useState(Date.now)
  const seconds =
    session.deadline === null
      ? session.remaining
      : Math.max(0, Math.ceil((session.deadline - now) / 1000))
  const finished = seconds === 0
  const running = session.deadline !== null && !finished
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {
      /* 计时在当前页面继续可用。 */
    }
  }, [session])
  useEffect(() => {
    if (!running) return
    const interval = window.setInterval(() => setNow(Date.now()), 500)
    return () => window.clearInterval(interval)
  }, [running])
  const reset = (duration = session.duration) => {
    setNow(Date.now())
    setSession({ duration, remaining: duration * 60, deadline: null })
  }
  const toggle = () => {
    const timestamp = Date.now()
    setNow(timestamp)
    if (running)
      setSession({
        ...session,
        deadline: null,
        remaining: Math.max(
          0,
          Math.ceil(((session.deadline ?? timestamp) - timestamp) / 1000),
        ),
      })
    else
      setSession({
        ...session,
        remaining: finished ? session.duration * 60 : seconds,
        deadline:
          timestamp + (finished ? session.duration * 60 : seconds) * 1000,
      })
  }
  return (
    <section className="focus-panel paper-panel" aria-labelledby="focus-title">
      <div className="section-title-row">
        <h2 id="focus-title">专注一小步</h2>
        <select
          aria-label="专注时长"
          disabled={running}
          value={session.duration}
          onChange={(event) => reset(Number(event.currentTarget.value))}
        >
          <option value={15}>15 分钟</option>
          <option value={25}>25 分钟</option>
          <option value={45}>45 分钟</option>
        </select>
      </div>
      <div className="focus-clock">
        <Leaf size={22} strokeWidth={1.2} />
        <span
          role="timer"
          aria-label={`剩余 ${Math.floor(seconds / 60)} 分 ${seconds % 60} 秒`}
        >
          {String(Math.floor(seconds / 60)).padStart(2, '0')}:
          {String(seconds % 60).padStart(2, '0')}
        </span>
        <Leaf size={22} strokeWidth={1.2} />
      </div>
      <div className="focus-actions">
        <Button
          className="flex-1"
          icon={
            running ? (
              <Pause size={16} />
            ) : (
              <Play size={16} fill="currentColor" />
            )
          }
          onClick={toggle}
        >
          {running
            ? '暂停一下'
            : finished
              ? '再专注一轮'
              : seconds < session.duration * 60
                ? '继续专注'
                : '开始专注'}
        </Button>
        {running || seconds !== session.duration * 60 ? (
          <button
            type="button"
            aria-label="重置专注计时"
            className="icon-button"
            onClick={() => reset()}
          >
            <RotateCcw size={17} />
          </button>
        ) : null}
      </div>
      {finished ? (
        <p role="status" className="focus-done">
          这一小步，做得很好。起身休息一下吧。
        </p>
      ) : null}
    </section>
  )
}
