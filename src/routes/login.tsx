import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { Alert, Button, Card, Container, Form } from 'react-bootstrap'
import { pb } from '../lib/pocketbase'

export const Route = createFileRoute('/login')({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect:
      typeof search.redirect === 'string'
        ? search.redirect
        : undefined,
  }),
  component: LoginPage,
})

function LoginPage() {

  pb.authStore.clear()

  const navigate = useNavigate()
  const search = Route.useSearch()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    setLoading(true)
    setError('')

    try {
      await pb.collection('users').authWithPassword(email, password)
      navigate({
        to: search.redirect ?? '/',
      })
    } catch (err) {
      console.error(err)
      pb.authStore.clear()
      setError('ログイン情報が正しくありません。')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container
      className="d-flex justify-content-center align-items-center vh-100"
    >
      <Card style={{ width: '360px' }}>
        <Card.Body>
          <h2 className="h5 text-secondary text-center mb-4">
            Login to Things
          </h2>

          {error && (
            <Alert variant="danger">
              {error}
            </Alert>
          )}

          <Form onSubmit={handleSubmit}>
            <Form.Group className="mb-3">
              <Form.Label>MAIL</Form.Label>
              <Form.Control
                type="email"
                value={email}
                autoComplete="username"
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </Form.Group>

            <Form.Group className="mb-4">
              <Form.Label>PASSWORD</Form.Label>
              <Form.Control
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </Form.Group>

            <Button
              type="submit"
              className="w-100"
              disabled={loading}
            >
              {loading ? 'ログイン中...' : 'ログイン'}
            </Button>
          </Form>
        </Card.Body>
      </Card>
    </Container>
  )
}
