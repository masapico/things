import { Badge, Card } from 'react-bootstrap'
import type { ClipsResponse } from '../../../lib/pb_types'

type ClipCardProps = {
  clip: ClipsResponse
}

export function ClipCard({ clip }: ClipCardProps) {
  return (
    <Card className="h-100 shadow-sm">
      <Card.Body>
        <div className="d-flex justify-content-between align-items-start mb-2">
          <Card.Title as="h2" className="h6 mb-0">
            {clip.name}
          </Card.Title>
          <Badge bg="light" text="dark">
            Clip
          </Badge>
        </div>

        {clip.text ? <Card.Text className="text-muted mb-0">{clip.text}</Card.Text> : null}

        {!clip.text && clip.file?.length ? (
          <Card.Text className="text-muted mb-0">{clip.file.length} file(s)</Card.Text>
        ) : null}
      </Card.Body>
    </Card>
  )
}
