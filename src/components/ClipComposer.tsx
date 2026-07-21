import { useEffect, useState } from 'react'
import { Button, Form, Modal } from 'react-bootstrap'
import { pb } from '../lib/pocketbase'
import { ClipboardPlusIcon } from 'lucide-react'

type ClipType = 'text' | 'image' | 'file'

export function ClipComposer() {
    const [showModal, setShowModal] = useState(false)
    const [clipType, setClipType] = useState<ClipType>('text')
    const [textContent, setTextContent] = useState('')
    const [fileContent, setFileContent] = useState<File | null>(null)
    const [previewUrl, setPreviewUrl] = useState('')
    const [title, setTitle] = useState('')
    const [statusMessage, setStatusMessage] = useState('')

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const target = event.target as HTMLElement | null
            const isEditable = target?.isContentEditable || ['INPUT', 'TEXTAREA'].includes(target?.tagName ?? '')

            if (isEditable) {
                return
            }

            const items = event.clipboardData?.items
            if (!items?.length) {
                return
            }

            for (const item of items) {
                if (item.kind === 'file') {
                    const file = item.getAsFile()
                    if (file) {
                        setFileContent(file)
                        setClipType(file.type.startsWith('image/') ? 'image' : 'file')
                        setTitle(file.name || 'Pasted file')
                        setTextContent('')
                        setStatusMessage('')
                        setPreviewUrl((current) => {
                            if (current) {
                                URL.revokeObjectURL(current)
                            }
                            return URL.createObjectURL(file)
                        })
                        setShowModal(true)
                        event.preventDefault()
                        return
                    }
                }

                if (item.kind === 'string' && item.type === 'text/plain') {
                    item.getAsString((text) => {
                        setTextContent(text)
                        setClipType('text')
                        setFileContent(null)
                        setTitle('Pasted text')
                        setStatusMessage('')
                        setPreviewUrl((current) => {
                            if (current) {
                                URL.revokeObjectURL(current)
                            }
                            return ''
                        })
                        setShowModal(true)
                    })
                    event.preventDefault()
                    return
                }
            }
        }

        window.addEventListener('paste', handlePaste)
        return () => window.removeEventListener('paste', handlePaste)
    }, [])

    useEffect(() => {
        return () => {
            if (previewUrl) {
                URL.revokeObjectURL(previewUrl)
            }
        }
    }, [previewUrl])

    const resetState = () => {
        setShowModal(false)
        setTextContent('')
        setFileContent(null)
        setClipType('text')
        setTitle('')
        setStatusMessage('')
        setPreviewUrl((current) => {
            if (current) {
                URL.revokeObjectURL(current)
            }
            return ''
        })
    }

    const handleSave = async () => {
        try {
            const formData = new FormData()
            const safeTitle = title.trim() || (clipType === 'text' ? 'Pasted text' : fileContent?.name || 'Pasted clip')
            formData.append('name', safeTitle)

            if (clipType === 'text') {
                formData.append('text', textContent)
            } else if (fileContent) {
                formData.append('file', fileContent, fileContent.name)
            }

            await pb.collection('clips').create(formData)
            setStatusMessage('Clip saved successfully.')
            resetState()
        } catch (error) {
            console.error('Failed to save clip:', error)
            setStatusMessage('Failed to save the clip. Please try again.')
        }
    }

    return (
        <div className="clip-composer">
            {statusMessage ? <p className="text-success">{statusMessage}</p> : null}

            <Modal show={showModal} onHide={resetState} centered>
                <Modal.Header closeButton>
                    <Modal.Title><ClipboardPlusIcon className="me-2" />Register clip</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form.Group className="mb-3">
                        <Form.Label>Title</Form.Label>
                        <Form.Control
                            type="text"
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                        />
                    </Form.Group>

                    <Form.Group className="mb-3">
                        <Form.Label>Preview</Form.Label>

                        {clipType === 'text' ? (
                            <Form.Control
                                as="textarea"
                                rows={6}
                                value={textContent}
                                onChange={(event) => setTextContent(event.target.value)}
                            />
                        ) : null}

                        {clipType === 'image' ? (
                            <div className="border rounded p-2 text-center">
                                <img src={previewUrl} alt="Preview" style={{ maxWidth: '100%', maxHeight: '280px' }} />
                            </div>
                        ) : null}

                        {clipType === 'file' ? (
                            <div className="border rounded p-3 bg-light">
                                <strong>{fileContent?.name ?? 'File'}</strong>
                                {fileContent?.size ? ` (${Math.round(fileContent.size / 1024)} KB)` : null}
                            </div>
                        ) : null}
                    </Form.Group>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={resetState}>
                        Cancel
                    </Button>
                    <Button variant="primary" onClick={handleSave}>
                        Save Clip
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    )
}

export default ClipComposer
