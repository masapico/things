import { useState } from "react";
import { Button, Form, Modal } from "react-bootstrap";
import type { LaunchersKindOptions, LaunchersResponse } from "../../../lib/pb_types";

export type LauncherFormValue = { name: string; kind: LaunchersKindOptions; target: string; arguments: string };
type Props = { show: boolean; launcher: LaunchersResponse | null; isSaving: boolean; onClose: () => void; onSave: (value: LauncherFormValue) => void };

const EMPTY_VALUE: LauncherFormValue = { name: "", kind: "application", target: "", arguments: "" };

export function LauncherEditModal({ show, launcher, isSaving, onClose, onSave }: Props) {
  const [value, setValue] = useState<LauncherFormValue>(() => launcher ? { name: launcher.name, kind: launcher.kind, target: launcher.target, arguments: launcher.arguments ?? "" } : EMPTY_VALUE);
  const valid = value.name.trim() && value.target.trim();

  return <Modal show={show} onHide={onClose} centered>
    <Modal.Header closeButton><Modal.Title>{launcher ? "ランチャーを編集" : "ランチャーを登録"}</Modal.Title></Modal.Header>
    <Modal.Body><Form onSubmit={(event) => { event.preventDefault(); if (valid) onSave(value); }}>
      <Form.Group className="mb-3"><Form.Label>名前</Form.Label><Form.Control autoFocus maxLength={100} value={value.name} onChange={(event) => setValue({ ...value, name: event.target.value })} placeholder="例: VS Code" /></Form.Group>
      <Form.Group className="mb-3"><Form.Label>種類</Form.Label><Form.Select value={value.kind} onChange={(event) => setValue({ ...value, kind: event.target.value as LaunchersKindOptions })}><option value="application">アプリ</option><option value="url">URL</option><option value="file">ファイル</option><option value="folder">フォルダ</option></Form.Select></Form.Group>
      <Form.Group className="mb-3"><Form.Label>対象</Form.Label><Form.Control maxLength={2048} value={value.target} onChange={(event) => setValue({ ...value, target: event.target.value })} placeholder="実行ファイル、URL、ファイルまたはフォルダのパス" /><Form.Text>環境変数（例: %LOCALAPPDATA%）も利用できます。</Form.Text></Form.Group>
      <Form.Group><Form.Label>引数（任意）</Form.Label><Form.Control maxLength={4096} value={value.arguments} onChange={(event) => setValue({ ...value, arguments: event.target.value })} placeholder="例: --new-window" /></Form.Group>
    </Form></Modal.Body>
    <Modal.Footer><Button variant="outline-secondary" onClick={onClose}>キャンセル</Button><Button onClick={() => onSave(value)} disabled={!valid || isSaving}>{isSaving ? "保存中…" : "保存"}</Button></Modal.Footer>
  </Modal>;
}
