import { useState, useEffect, useRef, useCallback } from "react";
import { Badge, Form, InputGroup, Spinner } from "react-bootstrap";
import { X, Search, FileText, Image, File } from "lucide-react";
import { getRecentClips, getClipsByIds, searchClips } from "../features/clips/api";
import type { ClipsResponse } from "../lib/pb_types";
import "./ClipSelector.css";

type ClipSelectorProps = {
  selectedClipIds: string[];
  onChange: (ids: string[]) => void;
  onClipClick?: (clip: ClipsResponse) => void;
};

function getFileExtension(fileName?: string) {
  if (!fileName) return null;
  const match = fileName.match(/\.([A-Za-z0-9]+)$/);
  return match ? match[1].toUpperCase() : null;
}

function getClipType(clip: ClipsResponse): "text" | "image" | "file" {
  if (clip.file) {
    const ext = getFileExtension(clip.file);
    if (
      ext &&
      ["PNG", "JPG", "JPEG", "GIF", "WEBP", "BMP", "SVG"].includes(ext)
    ) {
      return "image";
    }
    return "file";
  }
  return "text";
}

const TYPE_ICONS = {
  text: FileText,
  image: Image,
  file: File,
} as const;

export function ClipSelector({ selectedClipIds, onChange, onClipClick }: ClipSelectorProps) {
  // 選択済みクリップ（ID から実データを取得）
  const [selectedClips, setSelectedClips] = useState<ClipsResponse[]>([]);
  // 検索結果一覧
  const [searchResults, setSearchResults] = useState<ClipsResponse[]>([]);
  // 初期表示用の直近クリップ
  const [recentClips, setRecentClips] = useState<ClipsResponse[]>([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 初期表示: 直近 50 件を取得
  useEffect(() => {
    let cancelled = false;
    getRecentClips(50).then((clips) => {
      if (!cancelled) {
        setRecentClips(clips);
        setIsLoadingRecent(false);
      }
    });
    return () => { cancelled = true; };
  }, []);

  // 選択済み ID が変わったら実データを取得
  useEffect(() => {
    let cancelled = false;
    if (selectedClipIds.length === 0) {
      Promise.resolve().then(() => setSelectedClips([]));
      return;
    }
    getClipsByIds(selectedClipIds).then((clips) => {
      if (!cancelled) setSelectedClips(clips);
    });
    return () => { cancelled = true; };
  }, [selectedClipIds]);

  // 検索（デバウンス 300ms）
  const doSearch = useCallback((q: string) => {
    if (!q.trim()) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    searchClips(q.trim()).then((results) => {
      setSearchResults(results);
      setIsSearching(false);
    });
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => doSearch(searchQuery), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [searchQuery, doSearch]);

  // 表示するクリップ一覧: 検索中は検索結果、未検索時は直近クリップ
  const displayClips = searchQuery.trim() ? searchResults : recentClips;
  const isLoading = searchQuery.trim() ? isSearching : isLoadingRecent;

  function handleToggle(clipId: string) {
    if (selectedClipIds.includes(clipId)) {
      onChange(selectedClipIds.filter((id) => id !== clipId));
    } else {
      onChange([...selectedClipIds, clipId]);
    }
  }

  function handleRemove(clipId: string) {
    onChange(selectedClipIds.filter((id) => id !== clipId));
  }

  return (
    <div className="clip-selector">
      {/* 選択済みクリップ */}
      {selectedClips.length > 0 && (
        <div className="clip-selector-selected">
          {selectedClips.map((clip) => (
            <Badge
              key={clip.id}
              className={`clip-selector-badge ${onClipClick ? "clip-selector-badge--clickable" : ""}`}
              bg="light"
              text="dark"
            >
              <button
                type="button"
                className="clip-selector-badge-label"
                onClick={() => onClipClick?.(clip)}
                title={`${clip.name} を表示`}
              >
                {clip.name}
              </button>
              <button
                type="button"
                className="clip-selector-badge-remove"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRemove(clip.id);
                }}
                aria-label={`${clip.name} を解除`}
              >
                <X size={12} />
              </button>
            </Badge>
          ))}
        </div>
      )}

      {/* 検索入力 */}
      <InputGroup size="sm" className="clip-selector-search">
        <InputGroup.Text>
          <Search size={14} />
        </InputGroup.Text>
        <Form.Control
          type="text"
          placeholder="クリップを検索..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </InputGroup>

      {/* クリップ一覧 */}
      <div className="clip-selector-list">
        {isLoading ? (
          <div className="clip-selector-loading">
            <Spinner animation="border" size="sm" />
          </div>
        ) : displayClips.length === 0 ? (
          <p className="clip-selector-empty">
            {searchQuery.trim()
              ? "該当するクリップがありません"
              : "クリップがありません"}
          </p>
        ) : (
          displayClips.map((clip) => {
            const clipType = getClipType(clip);
            const TypeIcon = TYPE_ICONS[clipType];
            const isSelected = selectedClipIds.includes(clip.id);

            return (
              <label
                key={clip.id}
                className={`clip-selector-item ${isSelected ? "clip-selector-item--selected" : ""}`}
              >
                <Form.Check
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => handleToggle(clip.id)}
                  id={`clip-select-${clip.id}`}
                />
                <TypeIcon size={14} className="clip-selector-item-icon" />
                <span className="clip-selector-item-name">{clip.name}</span>
                <span className="clip-selector-item-type">{clipType}</span>
              </label>
            );
          })
        )}
      </div>
    </div>
  );
}