import { Card, Image } from 'react-bootstrap'
import type { ClipsResponse } from '../../../lib/pb_types'
import { pb } from '../../../lib/pocketbase'

type ClipCardProps = {
  clip: ClipsResponse
}

function formatDate(value?: string) {
  if (!value) return ''

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return date.toLocaleString('ja-JP', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getThumbnailUrl(clip: ClipsResponse) {
  const fileName = clip.file?.[0]
  if (!fileName) return null

  return `${pb.baseUrl}/api/files/${clip.collectionId}/${clip.id}/${fileName}?thumb=100x100`
}

export function ClipCard({ clip }: ClipCardProps) {
  const thumbnailUrl = getThumbnailUrl(clip)

  return (
    <Card className="h-100 shadow-sm border-0">
      <Card.Body className="d-flex flex-column gap-2">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <Card.Title as="h2" className="h6 mb-0 flex-grow-1">
            {clip.name}
          </Card.Title>
        </div>

        {thumbnailUrl ? (
          <div className="d-flex justify-content-center align-items-center rounded bg-light p-2" style={{ minHeight: 120 }}>
            <Image
              src={thumbnailUrl}
              alt={clip.name}
              rounded
              className="img-fluid"
              style={{ maxHeight: 100, width: 'auto', objectFit: 'contain' }}
            />
          </div>
        ) : null}

        {clip.text ? <Card.Text className="text-muted mb-0">{clip.text}</Card.Text> : null}

        {!clip.text && clip.file?.length ? (
          <Card.Text className="text-muted mb-0">{clip.file.length} file(s)</Card.Text>
        ) : null}

        <div className="text-muted small mt-auto">
          {formatDate(clip.created)}
        </div>
      </Card.Body>
    </Card>
  )
}
