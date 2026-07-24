import { useState } from "react";
import { Button, Form, ListGroup, Modal, Spinner, Stack } from "react-bootstrap";
import { Pencil, Trash2, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { useContexts, useCreateContext, useUpdateContext, useDeleteContext } from "../hooks/useContexts";
import type { ContextsResponse } from "../../../lib/pb_types";

export function ContextManager() {
  const { data: contexts = [], isLoading, isError } = useContexts();
  const createMutation = useCreateContext();
  const updateMutation = useUpdateContext();
  const deleteMutation = useDeleteContext();

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingContext, setEditingContext] = useState<ContextsResponse | null>(null);
  const [newName, setNewName] = useState("");
  const [editName, setEditName] = useState("");

  // --- Create ---
  const handleOpenCreate = () => {
    setNewName("");
    setShowCreateModal(true);
  };

  const handleCreate = async () => {
    if (!newName.trim()) return;
    const maxSort = contexts.reduce((max, c) => Math.max(max, c.sort ?? 0), 0);
    await createMutation.mutateAsync({ name: newName.trim(), sort: maxSort + 1 });
    setShowCreateModal(false);
  };

  // --- Edit ---
  const handleOpenEdit = (ctx: ContextsResponse) => {
    setEditingContext(ctx);
    setEditName(ctx.name);
    setShowEditModal(true);
  };

  const handleUpdate = async () => {
    if (!editingContext || !editName.trim()) return;
    await updateMutation.mutateAsync({
      id: editingContext.id,
      data: { name: editName.trim() },
    });
    setShowEditModal(false);
    setEditingContext(null);
  };

  // --- Delete ---
  const handleDelete = async (ctx: ContextsResponse) => {
    if (!window.confirm(`"${ctx.name}" を削除してもよろしいですか？`)) return;
    await deleteMutation.mutateAsync(ctx.id);
  };

  // --- Sort ---
  const moveItem = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= contexts.length) return;

    const current = contexts[index];
    const target = contexts[targetIndex];

    // Swap sort values
    await Promise.all([
      updateMutation.mutateAsync({
        id: current.id,
        data: { sort: target.sort ?? 0 },
      }),
      updateMutation.mutateAsync({
        id: target.id,
        data: { sort: current.sort ?? 0 },
      }),
    ]);
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <Spinner animation="border" />
      </div>
    );
  }

  if (isError) {
    return <p className="text-danger">コンテキストの読み込みに失敗しました。</p>;
  }

  return (
    <div>
      <Stack direction="horizontal" className="justify-content-between align-items-center mb-3">
        <h5 className="mb-0">コンテキスト</h5>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus size={16} className="me-1" />
          追加
        </Button>
      </Stack>

      {contexts.length === 0 ? (
        <p className="text-muted">コンテキストが登録されていません。</p>
      ) : (
        <ListGroup>
          {contexts.map((ctx, index) => (
            <ListGroup.Item
              key={ctx.id}
              className="d-flex justify-content-between align-items-center py-2"
            >
              <Stack direction="horizontal" gap={2} className="align-items-center">
                <Stack direction="vertical" gap={0} className="d-flex align-items-center">
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-muted lh-1"
                    disabled={index === 0}
                    onClick={() => moveItem(index, -1)}
                    title="上に移動"
                  >
                    <ArrowUp size={12} />
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    className="p-0 text-muted lh-1"
                    disabled={index === contexts.length - 1}
                    onClick={() => moveItem(index, 1)}
                    title="下に移動"
                  >
                    <ArrowDown size={12} />
                  </Button>
                </Stack>
                <span className="ms-1">{ctx.name}</span>
              </Stack>
              <div className="d-flex gap-1">
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={() => handleOpenEdit(ctx)}
                  title="編集"
                >
                  <Pencil size={14} />
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDelete(ctx)}
                  title="削除"
                >
                  <Trash2 size={14} />
                </Button>
              </div>
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {/* Create Modal */}
      <Modal show={showCreateModal} onHide={() => setShowCreateModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>コンテキストを追加</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <Form.Group>
              <Form.Label>名前</Form.Label>
              <Form.Control
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="コンテキスト名を入力"
                autoFocus
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCreateModal(false)}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <Plus size={16} className="me-1" />
            )}
            追加
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>コンテキストを編集</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form
            onSubmit={(e) => {
              e.preventDefault();
              handleUpdate();
            }}
          >
            <Form.Group>
              <Form.Label>名前</Form.Label>
              <Form.Control
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="コンテキスト名を入力"
                autoFocus
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            キャンセル
          </Button>
          <Button
            variant="primary"
            onClick={handleUpdate}
            disabled={!editName.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <X size={16} className="me-1" />
            )}
            更新
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
