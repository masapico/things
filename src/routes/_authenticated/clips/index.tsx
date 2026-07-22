import { createFileRoute } from '@tanstack/react-router'
import { ClipsPage } from '../../../features/clips/pages/ClipsPage'

export const Route = createFileRoute('/_authenticated/clips/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <ClipsPage />
}
