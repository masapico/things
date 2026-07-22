// src/routes/index.tsx
import { useRef } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { ArrowBigRightDash, Inbox, ListPlus } from 'lucide-react'
import { Button, Container, Form, InputGroup, ListGroup, Row } from 'react-bootstrap'
import { useInboxTasks } from '../../features/gtd/hooks/useTasks'
import { useCreateInboxTask } from '../../features/gtd/hooks/useTaskCreate'


export const Route = createFileRoute('/_authenticated/')({
  component: Index,
})


function Index() {
  const taskTitleInput = useRef<HTMLInputElement>(null)

  const { data: inboxTasks } = useInboxTasks()
  const { mutate, isPending } = useCreateInboxTask();

  function handleAddTask(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault()

    const taskTitle = taskTitleInput.current ? taskTitleInput.current.value : ""
    if (taskTitle.trim() === "") return;

    mutate(
      {title: taskTitle, status: 'inbox'},
      {
        onSuccess: () => {
          if (taskTitleInput.current) taskTitleInput.current.value = "";
        }
      }
    )
  }

  return (
    <Container>
      <Row className="mt-5 mb-3 justify-content-center">
        <div className="w-75">
          <Form onSubmit={handleAddTask} id='inboxTaskInput'>
            <InputGroup>
              <Form.Control
              aria-label="input-task"
              aria-describedby="input-task"
              autoComplete='off'
              tabIndex={2}
              ref={taskTitleInput}
              />
                <Button size="sm" variant="outline-secondary" id="button-add-task" tabIndex={3}
                type='submit'
                style={{borderColor:"#ddd"}}
                disabled={isPending}>
                  {isPending ? "..." :<ListPlus />}
                </Button>
            </InputGroup>
          </Form>
        </div>
      </Row>

      <Row className='mb-3 justify-content-center'>
        <div className='w-75'>
          <div className='p-2'>
            <Inbox size={24} className='me-2' />Inbox
          </div>
          <ListGroup>
            {inboxTasks?.length === 0 && (
              <ListGroup.Item className="text-muted text-center py-3">
                Inbox は空です 🎉
              </ListGroup.Item>
            )}
            {inboxTasks?.map((task) => (
              <ListGroup.Item key={task.id}>{task.title}</ListGroup.Item>
            ))}
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
