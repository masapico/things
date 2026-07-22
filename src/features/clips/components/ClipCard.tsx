import { Badge, Card, Image } from 'react-bootstrap'
import type { ClipsResponse } from '../../../lib/pb_types'
import { pb } from '../../../lib/pocketbase'
import './ClipCard.css'

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
  const fileName = clip.file
  if (!fileName) return null

  return `${pb.baseURL}/api/files/${clip.collectionId}/${clip.id}/${fileName}?thumb=100x100`
}

function getFileExtension(fileName?: string) {
  if (!fileName) return null

  const match = fileName.match(/\.([A-Za-z0-9]+)$/)
  return match ? match[1].toUpperCase() : null
}

export function ClipCard({ clip }: ClipCardProps) {
  const thumbnailUrl = getThumbnailUrl(clip)
  const extension = getFileExtension(clip.file)

  return (
    <Card className="clip-card h-100">
      <Card.Body className="d-flex flex-column gap-2">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <Card.Title as="h2" className="clip-card-title h6 mb-0 flex-grow-1">
            {clip.name}
          </Card.Title>
          {extension ? (
            <Badge className="clip-card-badge" pill>
              {extension}
            </Badge>
          ) : null}
        </div>

        {thumbnailUrl ? (
          <div className="clip-card-thumb d-flex justify-content-center align-items-center p-2" style={{ minHeight: 120 }}>
            <Image
              src={thumbnailUrl}
              alt={clip.name}
              rounded
              className="img-fluid"
              style={{ maxHeight: 100, width: 'auto', objectFit: 'contain' }}
            />
          </div>
        ) : null}

        {clip.text ? (
          <div className="clip-card-note">
            <Card.Text className="clip-card-note-text mb-0">{clip.text}</Card.Text>
          </div>
        ) : null}

        <div className="clip-card-meta small mt-auto">
          {formatDate(clip.created)}
        </div>
      </Card.Body>
    </Card>
  )
}
