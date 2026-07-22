// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ArrowBigRightDash, Inbox, ListPlus } from 'lucide-react'
import { Button, Container, Form, InputGroup, ListGroup, Row } from 'react-bootstrap'

export const Route = createFileRoute('/_authenticated/')({
  component: Index,
})

function Index() {
  return (
    <Container>
      <Row className="mt-5 mb-3 justify-content-center">
        <div className="w-75">
          <InputGroup>
            <Form.Control
              aria-label="input-task"
              aria-describedby="input-task"
              autoComplete='off'
            />
            <Button size="sm" variant="outline-secondary" id="button-add-task">
              <ListPlus />
            </Button>
          </InputGroup>
        </div>
      </Row>

      <Row className='mb-3 justify-content-center'>
        <div className='w-75'>
          <div className='p-2'>
            <Inbox size={24} className='me-2' />Inbox
          </div>
          <ListGroup>
            <ListGroup.Item>aaaaa</ListGroup.Item>
            <ListGroup.Item>aaaaa</ListGroup.Item>
            <ListGroup.Item>aaaaa</ListGroup.Item>
            <ListGroup.Item>aaaaa</ListGroup.Item>
          </ListGroup>
        </div>
      </Row>

      <Row className='mb-3 justify-content-center'>
        <div className='w-75'>
          <div className='p-2'>
            <ArrowBigRightDash size={24} className='me-2' />Current
          </div>
          <ListGroup>
            <ListGroup.Item>aaaaa</ListGroup.Item>
            <ListGroup.Item>aaaaa</ListGroup.Item>
            <ListGroup.Item>aaaaa</ListGroup.Item>
            <ListGroup.Item>aaaaa</ListGroup.Item>
          </ListGroup>
        </div>
      </Row>
    </Container>
  )
}
