import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useState } from 'react'
import Editor, { type EditorContentJSON } from '../../components/Editor/Editor'
import { Button, Stack } from 'react-bootstrap'

import { Logout } from '../../lib/pocketbase'


export const Route = createFileRoute('/_authenticated/about')({
  component: About,
})

function About() {
  const [content, setContent] = useState<EditorContentJSON | null>(null);

  const handleSave = () => {
    // content はそのまま JSON.stringify して DB / localStorage / API に保存できます
    const json = JSON.stringify(content);
    console.log(json);
    // 例: localStorage.setItem('note', json);
  };

  const navigate = useNavigate();

  const handleLogout = () => {
    Logout();
    navigate({ to: '/login', search: { redirect: '/' } });
  };

  return (
    <div>
      <Editor value={content} onChange={setContent} />
      <Stack direction="horizontal" gap={2} className="mt-3">
        <Button variant="primary" className="mt-3" onClick={handleSave}>保存</Button>
        <Button variant="danger" className="mt-3" onClick={handleLogout}>ログアウト</Button>
      </Stack>
    </div>
  )
}
