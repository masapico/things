import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/notes')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_authenticated/notes"!</div>
}
