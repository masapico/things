import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'
import Editor, { type EditorContentJSON } from '../../components/Editor/Editor'
import { Button } from 'react-bootstrap'


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

  return (
    <div>
      <Editor value={content} onChange={setContent} />
      <Button variant="primary" className="mt-3" onClick={handleSave}>保存</Button>
    </div>
  )
}
