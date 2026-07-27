import { useState } from "react";
import { Form, ListGroup, Modal, Spinner, Stack } from "react-bootstrap";
import { Pencil, Trash2, Plus, X, ArrowUp, ArrowDown } from "lucide-react";
import { useContexts, useCreateContext, useUpdateContext, useDeleteContext } from "../hooks/useContexts";
import type { ContextsResponse } from "../../../lib/pb_types";
import "./ContextManager.css";

type ContextManagerProps = {
  selectedId?: string | null;
  onSelect?: (id: string, name: string) => void;
};

export function ContextManager({ selectedId, onSelect }: ContextManagerProps = {}) {
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
    <div className="context-manager">
      <Stack direction="horizontal" className="justify-content-between align-items-center mb-3">
        <h5 className="mb-0">コンテキスト</h5>
        <button className="btn-context-add" onClick={handleOpenCreate}>
          <Plus size={16} />
        </button>
      </Stack>

      {contexts.length === 0 ? (
        <p className="text-muted">コンテキストが登録されていません。</p>
      ) : (
        <ListGroup>
          {contexts.map((ctx, index) => {
            const isSelected = selectedId === ctx.id;
            return (
              <ListGroup.Item
                key={ctx.id}
                className={`d-flex justify-content-between align-items-center py-2${isSelected ? " context-selected" : ""}`}
                role={onSelect ? "button" : undefined}
                style={onSelect ? { cursor: "pointer" } : undefined}
                onClick={() => onSelect?.(ctx.id, ctx.name)}
              >
                <Stack direction="horizontal" gap={2} className="align-items-center">
                  <Stack direction="vertical" gap={0} className="d-flex align-items-center">
                    <button
                      className="btn-sort"
                      disabled={index === 0}
                      onClick={(e) => { e.stopPropagation(); moveItem(index, -1); }}
                      title="上に移動"
                    >
                      <ArrowUp size={12} />
                    </button>
                    <button
                      className="btn-sort"
                      disabled={index === contexts.length - 1}
                      onClick={(e) => { e.stopPropagation(); moveItem(index, 1); }}
                      title="下に移動"
                    >
                      <ArrowDown size={12} />
                    </button>
                  </Stack>
                  <span className="ms-1">{ctx.name}</span>
                </Stack>
                <div className="d-flex gap-1">
                  <button
                    className="btn-context-edit"
                    onClick={(e) => { e.stopPropagation(); handleOpenEdit(ctx); }}
                    title="編集"
                  >
                    <Pencil size={14} />
                  </button>
                  <button
                    className="btn-context-delete"
                    onClick={(e) => { e.stopPropagation(); handleDelete(ctx); }}
                    title="削除"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </ListGroup.Item>
            );
          })}
        </ListGroup>
      )}

      {/* Create Modal */}
      <Modal
        show={showCreateModal}
        onHide={() => setShowCreateModal(false)}
        dialogClassName="context-manager"
      >
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
          <button
            className="btn-modal-cancel"
            onClick={() => setShowCreateModal(false)}
          >
            キャンセル
          </button>
          <button
            className="btn-modal-primary"
            onClick={handleCreate}
            disabled={!newName.trim() || createMutation.isPending}
          >
            {createMutation.isPending ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <Plus size={16} />
            )}
          </button>
        </Modal.Footer>
      </Modal>

      {/* Edit Modal */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        dialogClassName="context-manager"
      >
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
          <button
            className="btn-modal-cancel"
            onClick={() => setShowEditModal(false)}
          >
            キャンセル
          </button>
          <button
            className="btn-modal-primary"
            onClick={handleUpdate}
            disabled={!editName.trim() || updateMutation.isPending}
          >
            {updateMutation.isPending ? (
              <Spinner size="sm" animation="border" />
            ) : (
              <X size={16} />
            )}
            更新
          </button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}
