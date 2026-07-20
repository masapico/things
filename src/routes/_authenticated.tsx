import { createFileRoute, redirect, Outlet } from '@tanstack/react-router'
import { pb } from '../lib/pocketbase'
import { Container, Row } from 'react-bootstrap'

import Header from '../components/Header'

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
    <Container>
      <Row>
        <Header />
      </Row>
      <Row>
        <Outlet />
      </Row>
    </Container>
  )
}
