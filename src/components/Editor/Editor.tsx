"use client";

import { useEffect, useRef } from 'react';
import { useEditor, EditorContent, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import ResizableImage from './ResizableImage';
import styles from './Editor.module.css';

export type EditorContentJSON = JSONContent;

interface EditorProps {
  /** 現在のコンテンツ（Tiptap の JSON 形式）。null/undefined で空エディタ */
  value: EditorContentJSON | null | undefined;
  /** 内容が変わるたびに JSON を返すコールバック */
  onChange: (value: EditorContentJSON) => void;
  /** プレースホルダー文言（任意） */
  placeholder?: string;
  /** 編集不可にしたい場合 */
  editable?: boolean;
}

/** File(画像) を base64 の DataURL に変換 */
function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Editor({
  value,
  onChange,
  placeholder = 'ここに入力...',
  editable = true,
}: EditorProps) {
  // 親からの value 更新で setContent する際に onUpdate が誤発火するのを防ぐフラグ
  const isSyncingFromProp = useRef(false);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TaskList,
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'tiptap-task-item',
        },
      }),
      ResizableImage,
      Placeholder.configure({ placeholder }),
    ],
    content: value ?? '',
    editable,
    editorProps: {
      attributes: {
        class: styles.proseMirror,
      },
      // 画像貼り付け（クリップボード）を base64 として挿入
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (!items) return false;

        const imageItem = Array.from(items).find((item) =>
          item.type.startsWith('image/')
        );
        if (!imageItem) return false; // 画像以外はデフォルト動作に任せる

        const file = imageItem.getAsFile();
        if (!file) return false;

        event.preventDefault();

        fileToBase64(file).then((base64) => {
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src: base64 });
          const transaction = view.state.tr.replaceSelectionWith(node);
          view.dispatch(transaction);
        });

        return true; // 独自処理したのでデフォルト動作を抑止
      },
      // ドラッグ&ドロップでの画像挿入にも対応（任意・お好みで削除可）
      handleDrop: (view, event) => {
        const files = event.dataTransfer?.files;
        if (!files || files.length === 0) return false;

        const imageFile = Array.from(files).find((f) =>
          f.type.startsWith('image/')
        );
        if (!imageFile) return false;

        event.preventDefault();

        fileToBase64(imageFile).then((base64) => {
          const { schema } = view.state;
          const node = schema.nodes.image.create({ src: base64 });
          const coordinates = view.posAtCoords({
            left: event.clientX,
            top: event.clientY,
          });
          const transaction = view.state.tr.insert(
            coordinates?.pos ?? view.state.selection.from,
            node
          );
          view.dispatch(transaction);
        });

        return true;
      },
    },
    onUpdate: ({ editor: e }) => {
      if (isSyncingFromProp.current) return;
      onChange(e.getJSON());
    },
  });

  // 親コンポーネントから value が変わったとき（例: 別データの読み込み）にエディタへ反映
  useEffect(() => {
    if (!editor) return;
    const current = JSON.stringify(editor.getJSON());
    const incoming = JSON.stringify(value ?? '');
    if (current === incoming) return;

    isSyncingFromProp.current = true;
    editor.commands.setContent(value ?? '', { emitUpdate: false });
    isSyncingFromProp.current = false;
    // value / editor が変わったときのみ実行
  }, [value, editor]);

  if (!editor) return null;

  return (
    <div className={styles.wrapper}>
      <Toolbar editor={editor} />
      <EditorContent editor={editor} />
    </div>
  );
}

type ToolbarButton = {
  label: string;
  title: string;
  disabled?: () => boolean;
  isActive?: () => boolean;
  onClick: () => void;
};

/** よく使う編集操作をまとめたツールバー */
function Toolbar({ editor }: { editor: NonNullable<ReturnType<typeof useEditor>> }) {
  const groups: ToolbarButton[][] = [
    [
      {
        label: '↺',
        title: '元に戻す',
        disabled: () => !editor.can().undo(),
        onClick: () => editor.chain().focus().undo().run(),
      },
      {
        label: '↻',
        title: 'やり直す',
        disabled: () => !editor.can().redo(),
        onClick: () => editor.chain().focus().redo().run(),
      },
    ],
    [
      {
        label: 'B',
        title: '太字',
        isActive: () => editor.isActive('bold'),
        onClick: () => editor.chain().focus().toggleBold().run(),
      },
      {
        label: 'I',
        title: '斜体',
        isActive: () => editor.isActive('italic'),
        onClick: () => editor.chain().focus().toggleItalic().run(),
      },
      {
        label: 'S',
        title: '打ち消し線',
        isActive: () => editor.isActive('strike'),
        onClick: () => editor.chain().focus().toggleStrike().run(),
      },
    ],
    [
      {
        label: 'H2',
        title: '見出し大',
        isActive: () => editor.isActive('heading', { level: 1 }),
        onClick: () =>
          editor.chain().focus().toggleHeading({ level: 1 }).run(),
      },
      {
        label: 'H3',
        title: '見出し小',
        isActive: () => editor.isActive('heading', { level: 2 }),
        onClick: () =>
          editor.chain().focus().toggleHeading({ level: 2 }).run(),
      },
      {
        label: '•',
        title: '箇条書き',
        isActive: () => editor.isActive('bulletList'),
        onClick: () => editor.chain().focus().toggleBulletList().run(),
      },
      {
        label: '☑',
        title: 'チェックリスト',
        isActive: () => editor.isActive('taskList'),
        onClick: () => editor.chain().focus().toggleTaskList().run(),
      },
      {
        label: '1.',
        title: '番号付きリスト',
        isActive: () => editor.isActive('orderedList'),
        onClick: () => editor.chain().focus().toggleOrderedList().run(),
      },
      {
        label: '❝',
        title: '引用',
        isActive: () => editor.isActive('blockquote'),
        onClick: () => editor.chain().focus().toggleBlockquote().run(),
      },
      {
        label: '</>',
        title: 'コードブロック',
        isActive: () => editor.isActive('codeBlock'),
        onClick: () => editor.chain().focus().toggleCodeBlock().run(),
      },
    ],
  ];

  return (
    <div className={styles.toolbar}>
      {groups.map((group, index) => (
        <div key={`group-${index}`} className={styles.toolbarGroup}>
          {group.map((btn) => (
            <button
              key={btn.title}
              type="button"
              title={btn.title}
              aria-label={btn.title}
              aria-pressed={btn.isActive?.() ?? false}
              className={`${styles.toolbarButton} ${
                btn.isActive?.() ? styles.toolbarButtonActive : ''
              }`}
              onClick={btn.onClick}
              disabled={btn.disabled?.() ?? !editor.isEditable}
            >
              {btn.label}
            </button>
          ))}
        </div>
      ))}
    </div>
  );
}

