import { Link } from 'react-router-dom'
import { Button } from '../components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center text-center">
      <p className="text-sm font-medium text-primary">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-ink">这个人生节点还不存在</h1>
      <p className="mt-2 text-sm text-muted">返回角色总览，继续当前成长路线。</p>
      <Link to="/" className="mt-5">
        <Button>返回角色总览</Button>
      </Link>
    </div>
  )
}
