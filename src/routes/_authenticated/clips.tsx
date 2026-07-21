import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/clips')({
  component: RouteComponent,
})

function RouteComponent() {
  return (
    <div className="container py-4">
      <p className="text-muted">Paste text, images, or files anywhere in the app to create a clip.</p>
    </div>
  )
}
