import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { pb } from '../lib/pocketbase'

export const Route = createFileRoute('/_authenticated')({
  // この配下の全ルートへのアクセス前に一括で実行される
  beforeLoad: async ({ location }) => {
    try {
        await pb.collection("users").authRefresh()
    } catch {
        pb.authStore.clear()
        throw redirect({
            to: "/login",
            search: {
                redirect: location.href,
            },
        })
    }
  },
  // 認証済みレイアウト
  component: AuthLayout,
})

function AuthLayout() {
  return (
    <div className="container">
      {/* 共通のサイドバーやナビゲーションを置くことも可能 */}
      <aside>Dashboard Navigation</aside>
      <main>
        {/* 子ルート (dashboard.tsx や profile.tsx) がここに描画される */}
        <Outlet />
      </main>
    </div>
  )
}
