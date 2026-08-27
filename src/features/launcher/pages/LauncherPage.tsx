import { useCallback, useEffect, useMemo, useState } from "react";
import { DragDropProvider, type DragEndEvent } from "@dnd-kit/react";
import { isSortable, useSortable } from "@dnd-kit/react/sortable";
import { Alert, Button, Modal, Spinner } from "react-bootstrap";
import { AppWindowIcon, ExternalLinkIcon, FileIcon, FolderIcon, GripVerticalIcon, PencilIcon, PlusIcon, RocketIcon, Trash2Icon } from "lucide-react";
import type { LaunchersKindOptions, LaunchersResponse } from "../../../lib/pb_types";
import { useLauncherMutations, useLaunchers } from "../hooks/useLaunchers";
import { LauncherEditModal, type LauncherFormValue } from "../components/LauncherEditModal";
import "./LauncherPage.css";
import { AsyncState } from "../../../components/AsyncState";

const ICONS = { url: ExternalLinkIcon, application: AppWindowIcon, file: FileIcon, folder: FolderIcon } as const;
const LABELS: Record<LaunchersKindOptions, string> = { url: "URL", application: "アプリ", file: "ファイル", folder: "フォルダ" };

function SortableLauncher({ item, index, launching, onLaunch, onEdit, onDelete }: { item: LaunchersResponse; index: number; launching: boolean; onLaunch: () => void; onEdit: () => void; onDelete: () => void }) {
  const { ref, handleRef, isDragSource } = useSortable({ id: item.id, index });
  const Icon = ICONS[item.kind];
  return <div ref={ref} className={`launcher-row${isDragSource ? " launcher-row--dragging" : ""}`}>
    <button ref={handleRef} type="button" className="launcher-drag" aria-label="並べ替え"><GripVerticalIcon size={17} /></button>
    <button type="button" className="launcher-main" onClick={onLaunch} disabled={launching}>
      <span className={`launcher-kind launcher-kind--${item.kind}`}><Icon size={18} /></span>
      <span className="launcher-copy"><strong>{item.name}</strong><small>{item.target}</small></span>
      <span className="launcher-type">{LABELS[item.kind]}</span>
      {launching ? <Spinner size="sm" /> : <RocketIcon size={17} />}
    </button>
    <Button variant="link" className="launcher-action" aria-label="編集" onClick={onEdit}><PencilIcon size={16} /></Button>
    <Button variant="link" className="launcher-action launcher-action--danger" aria-label="削除" onClick={onDelete}><Trash2Icon size={16} /></Button>
  </div>;
}

function reorder<T>(items: T[], from: number, to: number) { const next = [...items]; const [item] = next.splice(from, 1); next.splice(to, 0, item); return next; }

export function LauncherPage() {
  const query = useLaunchers();
  const mutations = useLauncherMutations();
  const [localItems, setLocalItems] = useState<LaunchersResponse[] | null>(null);
  const [editing, setEditing] = useState<LaunchersResponse | null>(null);
  const [showEditor, setShowEditor] = useState(false);
  const [deleting, setDeleting] = useState<LaunchersResponse | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "danger"; text: string }>();
  const [launchingId, setLaunchingId] = useState<string>();
  const items = useMemo(() => localItems ?? query.data ?? [], [localItems, query.data]);
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(undefined), 3500); return () => window.clearTimeout(timer); }, [message]);

  const save = (value: LauncherFormValue) => {
    const data = { ...value, name: value.name.trim(), target: value.target.trim(), arguments: value.arguments.trim() || undefined };
    const options = { onSuccess: () => { setShowEditor(false); setEditing(null); setMessage({ kind: "success" as const, text: "保存しました。" }); }, onError: () => setMessage({ kind: "danger" as const, text: "保存できませんでした。" }) };
    if (editing) mutations.update.mutate({ id: editing.id, data }, options);
    else mutations.create.mutate({ ...data, sort: items.length * 100 }, options);
  };
  const launch = (item: LaunchersResponse) => { setLaunchingId(item.id); mutations.launch.mutate(item.id, { onSuccess: () => setMessage({ kind: "success", text: `${item.name} を起動しました。` }), onError: () => setMessage({ kind: "danger", text: "起動できませんでした。対象と引数を確認してください。" }), onSettled: () => setLaunchingId(undefined) }); };
  const dragEnd = useCallback((event: DragEndEvent) => {
    if (event.canceled || !isSortable(event.operation.source)) return;
    const from = event.operation.source.initialIndex, to = event.operation.source.index;
    if (from === to) return;
    const next = reorder(items, from, to); setLocalItems(next);
    mutations.reorder.mutate(next.map((item, index) => ({ id: item.id, sort: index * 100 })), {
      onError: () => setMessage({ kind: "danger", text: "並べ替えを保存できなかったため、元の順序に戻しました。" }),
      onSettled: () => setLocalItems(null),
    });
  }, [items, mutations.reorder]);

  if (query.isLoading) return <div className="launcher-page"><AsyncState kind="loading" message="ランチャーを読み込んでいます…" /></div>;
  if (query.isError) return <div className="launcher-page"><AsyncState kind="error" message="ランチャーを読み込めませんでした。" onRetry={() => void query.refetch()} /></div>;
  return <div className="launcher-page">
    <div className="launcher-header"><div><h1><RocketIcon size={23} /> Launcher</h1><p>よく使うアプリ、URL、ファイル、フォルダをすぐに開きます。</p></div><Button onClick={() => { setEditing(null); setShowEditor(true); }}><PlusIcon size={16} /> 登録</Button></div>
    {query.isFetching ? <div className="app-background-status mb-2" role="status"><Spinner animation="border" size="sm" />更新中</div> : null}
    {message && <Alert variant={message.kind} dismissible onClose={() => setMessage(undefined)} role={message.kind === "danger" ? "alert" : "status"}>{message.text}</Alert>}
    {items.length ? <DragDropProvider onDragEnd={dragEnd}><div className="launcher-list">{items.map((item, index) => <SortableLauncher key={item.id} item={item} index={index} launching={launchingId === item.id} onLaunch={() => launch(item)} onEdit={() => { setEditing(item); setShowEditor(true); }} onDelete={() => setDeleting(item)} />)}</div></DragDropProvider> : <div className="launcher-empty"><RocketIcon size={32} /><p>ランチャー項目はまだありません。</p><Button variant="outline-primary" onClick={() => setShowEditor(true)}>最初の項目を登録</Button></div>}
    <LauncherEditModal key={`${editing?.id ?? "new"}-${showEditor}`} show={showEditor} launcher={editing} isSaving={mutations.create.isPending || mutations.update.isPending} onClose={() => { setShowEditor(false); setEditing(null); }} onSave={save} />
    <Modal show={!!deleting} onHide={() => !mutations.remove.isPending && setDeleting(null)} centered size="sm"><Modal.Header closeButton={!mutations.remove.isPending}><Modal.Title>項目を削除</Modal.Title></Modal.Header><Modal.Body>「{deleting?.name}」を削除しますか？</Modal.Body><Modal.Footer><Button variant="outline-secondary" disabled={mutations.remove.isPending} onClick={() => setDeleting(null)}>キャンセル</Button><Button variant="danger" disabled={mutations.remove.isPending} onClick={() => deleting && mutations.remove.mutate(deleting.id, { onSuccess: () => { setDeleting(null); setMessage({ kind: "success", text: "削除しました。" }); }, onError: () => setMessage({ kind: "danger", text: "削除できませんでした。もう一度お試しください。" }) })}>{mutations.remove.isPending ? <><Spinner animation="border" size="sm" /> 削除中</> : "削除"}</Button></Modal.Footer></Modal>
  </div>;
}
