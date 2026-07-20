// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/')({
  component: Index,
})

function Index() {
  return <div className="p-2">Hello from Index!</div>
}
