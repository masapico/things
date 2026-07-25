import { useState } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Container } from "react-bootstrap";
import { LogOut, Paperclip, ListTodo, Home, Settings } from "lucide-react";
import { ClipRegister } from "../features/clips/components/ClipRegister";
import { ClipDetailModal } from "../features/clips/components/ClipDetailModal";
import { TaskEditModal } from "../features/gtd/components/TaskEditModal";
import { OmniSearch, type OmniSearchResult } from "./OmniSearch";
import type { ClipsResponse, TasksResponse } from "../lib/pb_types";
import "./Header.css";

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();

  const [selectedClip, setSelectedClip] = useState<ClipsResponse | null>(null);
  const [showClipModal, setShowClipModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TasksResponse | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);

  function handleOmniSelect(result: OmniSearchResult) {
    switch (result.type) {
      case "clip":
        setSelectedClip(result.data);
        setShowClipModal(true);
        break;
      case "task":
        setSelectedTask(result.data);
        setShowTaskModal(true);
        break;
      case "project":
        navigate({ to: "/gtd/$projectid", params: { projectid: result.data.id } });
        break;
    }
  }

  const navItems = [
    { to: "/", icon: Home, label: "HOME" },
    { to: "/clips", icon: Paperclip, label: "CLIPS" },
    { to: "/gtd", icon: ListTodo, label: "GTD" },
    { to: "/settings", icon: Settings, label: "SETTINGS" },
  ];

  return (
    <>
      <header className="app-header">
        <Container>
          <div className="app-header-inner">
            {/* 左: ナビゲーション */}
            <nav className="app-header-nav">
              {navItems.map(({ to, icon: Icon, label }) => {
                const isActive = pathname === to || (to !== "/" && pathname.startsWith(to));
                return (
                  <Link
                    key={to}
                    to={to}
                    className={`app-header-nav-item${isActive ? " app-header-nav-item--active" : ""}`}
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </nav>

            {/* 中央: 検索 */}
            <div className="app-header-search">
              <OmniSearch onSelect={handleOmniSelect} />
            </div>

            {/* 右: ログアウト */}
            <Link
              to="/login"
              search={{ redirect: window.location.pathname }}
              className="app-header-logout"
              title="ログアウト"
            >
              <LogOut size={17} />
            </Link>
          </div>
        </Container>
        <ClipRegister />
      </header>

      {/* Clip Detail Modal */}
      {selectedClip && (
        <ClipDetailModal
          clip={selectedClip}
          show={showClipModal}
          onClose={() => setShowClipModal(false)}
        />
      )}

      {/* Task Edit Modal */}
      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          show={showTaskModal}
          onClose={() => setShowTaskModal(false)}
        />
      )}
    </>
  );
}

export default Header;