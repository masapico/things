"use client";

import Image from '@tiptap/extension-image';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useCallback, useRef, useState } from 'react';
import styles from './Editor.module.css';

/**
 * 標準の Image 拡張に「width」属性を追加し、
 * NodeView でドラッグリサイズ用のハンドルを表示する拡張。
 * width は node attrs としてそのまま JSON に保存されるので、
 * 再読み込み時もサイズが復元される。
 */
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => element.style.width || element.getAttribute('width'),
        renderHTML: (attributes) => {
          if (!attributes.width) return {};
          return { style: `width: ${attributes.width}` };
        },
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ResizableImageView);
  },
});

export default ResizableImage;

function ResizableImageView({ node, updateAttributes, selected }: NodeViewProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [resizing, setResizing] = useState(false);

  const handlePointerDown = useCallback(
    (event: React.PointerEvent) => {
      event.preventDefault();
      const wrapperEl = wrapperRef.current;
      if (!wrapperEl) return;

      const startX = event.clientX;
      const startWidth = wrapperEl.getBoundingClientRect().width;
      setResizing(true);

      const handlePointerMove = (moveEvent: PointerEvent) => {
        const delta = moveEvent.clientX - startX;
        // 親要素の幅を超えないようにクランプ
        const parentWidth =
          wrapperEl.parentElement?.getBoundingClientRect().width ?? Infinity;
        const newWidth = Math.min(
          Math.max(startWidth + delta, 80), // 最小80px
          parentWidth
        );
        updateAttributes({ width: `${Math.round(newWidth)}px` });
      };

      const handlePointerUp = () => {
        setResizing(false);
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
      };

      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [updateAttributes]
  );

  return (
    <NodeViewWrapper
      as="div"
      ref={wrapperRef}
      className={styles.imageWrapper}
      style={{ width: node.attrs.width || '100%' }}
      data-selected={selected || undefined}
    >
      <img
        src={node.attrs.src}
        alt={node.attrs.alt || ''}
        className={styles.image}
        draggable={false}
      />
      <div
        className={`${styles.resizeHandle} ${resizing ? styles.resizeHandleActive : ''}`}
        onPointerDown={handlePointerDown}
      />
    </NodeViewWrapper>
  );
}
