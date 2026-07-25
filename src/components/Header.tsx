import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router"
import { Container, Stack } from "react-bootstrap"
import { LogOut, Paperclip , ListTodo } from 'lucide-react'
import { ClipRegister } from '../features/clips/components/ClipRegister'
import { ClipDetailModal } from '../features/clips/components/ClipDetailModal'
import { TaskEditModal } from '../features/gtd/components/TaskEditModal'
import { OmniSearch, type OmniSearchResult } from './OmniSearch'
import type { ClipsResponse, TasksResponse } from '../lib/pb_types'

export function Header() {
    const { pathname } = useLocation()
    const navigate = useNavigate()

    const [selectedClip, setSelectedClip] = useState<ClipsResponse | null>(null)
    const [showClipModal, setShowClipModal] = useState(false)
    const [selectedTask, setSelectedTask] = useState<TasksResponse | null>(null)
    const [showTaskModal, setShowTaskModal] = useState(false)

    function handleOmniSelect(result: OmniSearchResult) {
        switch (result.type) {
            case "clip":
                setSelectedClip(result.data)
                setShowClipModal(true)
                break
            case "task":
                setSelectedTask(result.data)
                setShowTaskModal(true)
                break
            case "project":
                navigate({ to: "/gtd/$projectid", params: { projectid: result.data.id } })
                break
        }
    }

    return (
        <>
          <Container className="border-bottom py-2">
            <Stack direction="horizontal" gap={4} className="mt-2 justify-content-center">
              <Link to="/clips">
                <Paperclip size={21} />
              </Link>
              <Link to="/gtd">
                <ListTodo size={21} />
              </Link>
              <div className="">
                  <OmniSearch onSelect={handleOmniSelect} />
              </div>
              <Link to="/" className={pathname === '/' ? 'active_menu' : ''}>HOME</Link>
              <Link to="/clips" className={pathname === '/clips' ? 'active_menu' : ''}>
                CLIPS
              </Link>
              <Link to="/gtd" className={pathname === '/gtd' ? 'active_menu' : ''}>
                GTD
              </Link>
              <Link to="/settings" className={pathname === '/settings' ? 'active_menu' : ''}>
                SETTINGS
              </Link>
               <Link to="/login" search={{ redirect: window.location.pathname }}>
                <LogOut size={18} className="text-danger" />
              </Link>
            </Stack>
            <ClipRegister />
          </Container>

          {/* Clip Detail Modal */}
          {selectedClip && (
            <ClipDetailModal
              clip={selectedClip}
              show={showClipModal}
              onClose={() => setShowClipModal(false)}
            />
          )}

          {/* Task Edit Modal */}
          {selectedTask && (
            <TaskEditModal
              task={selectedTask}
              show={showTaskModal}
              onClose={() => setShowTaskModal(false)}
            />
          )}


        </>
    )
}

export default Header
