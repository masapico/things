import { Alert, Col, Row, Spinner } from 'react-bootstrap'
import { ClipCard } from './ClipCard'
import type { ClipsResponse } from '../../../lib/pb_types'

type ClipListProps = {
  clips: ClipsResponse[]
  isLoading: boolean
  isError: boolean
}

export function ClipList({ clips, isLoading, isError }: ClipListProps) {
  if (isLoading) {
    return (
      <div className="d-flex align-items-center gap-2 text-muted">
        <Spinner animation="border" size="sm" />
        <span>Loading clips…</span>
      </div>
    )
  }

  if (isError) {
    return <Alert variant="danger">Failed to load clips.</Alert>
  }

  if (!clips.length) {
    return <Alert variant="light">No clips yet.</Alert>
  }

  return (
    <Row xs={1} md={2} lg={3} className="g-3">
      {clips.map((clip) => (
        <Col key={clip.id}>
          <ClipCard clip={clip} />
        </Col>
      ))}
    </Row>
  )
}
