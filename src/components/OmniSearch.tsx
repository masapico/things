import { useState, useEffect, useRef, useCallback } from "react";
import { Form, InputGroup, Spinner } from "react-bootstrap";
import {
  ScanSearch,
  Paperclip,
  ListTodo,
  FolderKanban,
  FileText,
  Image,
  File,
  Rocket,
} from "lucide-react";
import { searchClips } from "../features/clips/api";
import { searchTasks, searchProjects } from "../features/gtd/api";
import type {
  ClipsResponse,
  TasksResponse,
  ProjectsResponse,
} from "../lib/pb_types";
import type { LaunchersResponse } from "../lib/pb_types";
import { searchLaunchers } from "../features/launcher/api";
import "./OmniSearch.css";

export type OmniSearchResult =
  | { type: "clip"; data: ClipsResponse }
  | { type: "task"; data: TasksResponse }
  | { type: "project"; data: ProjectsResponse }
  | { type: "launcher"; data: LaunchersResponse };

type OmniSearchProps = {
  onSelect: (result: OmniSearchResult) => void | Promise<void>;
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

const CLIP_TYPE_ICONS = {
  text: FileText,
  image: Image,
  file: File,
} as const;

const STATUS_LABELS: Record<string, string> = {
  inbox: "Inbox",
  next: "Next",
  waiting: "Waiting",
  completed: "Done",
  someday: "Someday",
};

export function OmniSearch({ onSelect }: OmniSearchProps) {
  const [query, setQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [clips, setClips] = useState<ClipsResponse[]>([]);
  const [tasks, setTasks] = useState<TasksResponse[]>([]);
  const [projects, setProjects] = useState<ProjectsResponse[]>([]);
  const [launchers, setLaunchers] = useState<LaunchersResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const searchRequestRef = useRef(0);

  const flatResults = useCallback((): OmniSearchResult[] => {
    return [
      ...clips.map((c) => ({ type: "clip" as const, data: c })),
      ...tasks.map((t) => ({ type: "task" as const, data: t })),
      ...projects.map((p) => ({ type: "project" as const, data: p })),
      ...launchers.map((launcher) => ({ type: "launcher" as const, data: launcher })),
    ];
  }, [clips, tasks, projects, launchers]);

  // 検索実行（デバウンス 300ms）
  const runSearch = useCallback((trimmed: string, requestId: number) => {
    setIsLoading(true);
    setHasError(false);
    setErrorMessage("");
    Promise.all([
      searchClips(trimmed),
      searchTasks(trimmed),
      searchProjects(trimmed),
      searchLaunchers(trimmed),
    ])
      .then(([c, t, p, launcherItems]) => {
        if (requestId !== searchRequestRef.current) return;
        setClips(c);
        setTasks(t);
        setProjects(p);
        setLaunchers(launcherItems);
        setSelectedIndex(-1);
        setIsOpen(true);
      })
      .catch((err) => {
        if (requestId !== searchRequestRef.current) return;
        console.error("OmniSearch error:", err);
        setClips([]);
        setTasks([]);
        setProjects([]);
        setLaunchers([]);
        setHasError(true);
        setErrorMessage("検索できませんでした。入力し直してお試しください。");
        setIsOpen(true);
      })
      .finally(() => {
        if (requestId === searchRequestRef.current) {
          setIsLoading(false);
        }
      });
  }, []);

  function handleQueryChange(value: string) {
    setQuery(value);
    const requestId = ++searchRequestRef.current;

    if (debounceRef.current) clearTimeout(debounceRef.current);

    const trimmed = value.trim();
    if (!trimmed) {
      setClips([]);
      setTasks([]);
      setProjects([]);
      setLaunchers([]);
      setHasError(false);
      setErrorMessage("");
      setIsLoading(false);
      setIsOpen(false);
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(trimmed, requestId), 300);
  }

  // クリーンアップ
  useEffect(() => {
    return () => {
      searchRequestRef.current += 1;
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // クリックアウトサイドで閉じる
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function handleSelect(result: OmniSearchResult) {
    try {
      await onSelect(result);
      setQuery("");
      setIsOpen(false);
    } catch (error) {
      console.error("Launcher error:", error);
      setHasError(true);
      setErrorMessage("ランチャーを起動できませんでした。対象と引数を確認してください。");
      setIsOpen(true);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    const results = flatResults();
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < results.length - 1 ? prev + 1 : 0,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : results.length - 1,
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < results.length) {
        void handleSelect(results[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setIsOpen(false);
      inputRef.current?.blur();
    }
  }

  const hasResults = clips.length > 0 || tasks.length > 0 || projects.length > 0 || launchers.length > 0;

  return (
    <div className="omni-search" ref={containerRef}>
      <InputGroup size="sm">
        <InputGroup.Text id="omniSearch">
          <ScanSearch size={16} />
        </InputGroup.Text>
        <Form.Control
          ref={inputRef}
          aria-label="omniSearch"
          aria-describedby="omniSearch"
          tabIndex={1}
          placeholder="検索..."
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          onFocus={() => {
            if (query.trim()) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
        />
      </InputGroup>

      {isOpen && (
        <div className="omni-search-dropdown">
          {isLoading ? (
            <div className="omni-search-loading">
              <Spinner animation="border" size="sm" />
            </div>
          ) : hasError ? (
            <div className="omni-search-error" role="alert">
              {errorMessage || "処理できませんでした。"}
            </div>
          ) : !hasResults ? (
            <div className="omni-search-empty">該当する結果がありません</div>
          ) : (
            <>
              {clips.length > 0 && (
                <div className="omni-search-group">
                  <div className="omni-search-group-header">
                    <Paperclip size={12} />
                    Clips
                  </div>
                  {clips.map((clip, i) => {
                    const clipType = getClipType(clip);
                    const TypeIcon = CLIP_TYPE_ICONS[clipType];
                    const globalIndex = i;
                    return (
                      <button
                        key={clip.id}
                        type="button"
                        className={`omni-search-item ${selectedIndex === globalIndex ? "omni-search-item--active" : ""}`}
                        onClick={() =>
                            void handleSelect({ type: "clip", data: clip })
                        }
                      >
                        <TypeIcon size={14} className="omni-search-item-icon" />
                        <span className="omni-search-item-name">
                          {clip.name}
                        </span>
                        <span className="omni-search-item-meta">
                          {clipType}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {tasks.length > 0 && (
                <div className="omni-search-group">
                  <div className="omni-search-group-header">
                    <ListTodo size={12} />
                    Tasks
                  </div>
                  {tasks.map((task, i) => {
                    const globalIndex = clips.length + i;
                    return (
                      <button
                        key={task.id}
                        type="button"
                        className={`omni-search-item ${selectedIndex === globalIndex ? "omni-search-item--active" : ""}`}
                        onClick={() =>
                            void handleSelect({ type: "task", data: task })
                        }
                      >
                        <ListTodo
                          size={14}
                          className="omni-search-item-icon"
                        />
                        <span className="omni-search-item-name">
                          {task.title}
                        </span>
                        <span className="omni-search-item-meta">
                          {STATUS_LABELS[task.status] ?? task.status}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {projects.length > 0 && (
                <div className="omni-search-group">
                  <div className="omni-search-group-header">
                    <FolderKanban size={12} />
                    Projects
                  </div>
                  {projects.map((project, i) => {
                    const globalIndex = clips.length + tasks.length + i;
                    return (
                      <button
                        key={project.id}
                        type="button"
                        className={`omni-search-item ${selectedIndex === globalIndex ? "omni-search-item--active" : ""}`}
                        onClick={() =>
                            void handleSelect({ type: "project", data: project })
                        }
                      >
                        <FolderKanban
                          size={14}
                          className="omni-search-item-icon"
                        />
                        <span className="omni-search-item-name">
                          {project.name}
                        </span>
                        <span className="omni-search-item-meta">
                          {project.isActive ? "Active" : "Archived"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
              {launchers.length > 0 && (
                <div className="omni-search-group">
                  <div className="omni-search-group-header"><Rocket size={12} />Launcher</div>
                  {launchers.map((launcher, i) => {
                    const globalIndex = clips.length + tasks.length + projects.length + i;
                    return <button key={launcher.id} type="button" className={`omni-search-item ${selectedIndex === globalIndex ? "omni-search-item--active" : ""}`} onClick={() => void handleSelect({ type: "launcher", data: launcher })}>
                      <Rocket size={14} className="omni-search-item-icon" /><span className="omni-search-item-name">{launcher.name}</span><span className="omni-search-item-meta">起動</span>
                    </button>;
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
