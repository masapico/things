import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { Container } from "react-bootstrap";
import { LogOut, Paperclip, ListTodo, Home, Rocket } from "lucide-react";
import { ClipRegister } from "../features/clips/components/ClipRegister";
import { ClipDetailModal } from "../features/clips/components/ClipDetailModal";
import { TaskEditModal } from "../features/gtd/components/TaskEditModal";
import { OmniSearch, type OmniSearchResult } from "./OmniSearch";
import type { ClipsResponse, TasksResponse } from "../lib/pb_types";
import { launchItem } from "../features/launcher/api";
import { ClockTools } from "../features/clock/ClockTools";
import "./Header.css";

function useCurrentTime() {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    let interval: number | undefined;
    const delay = 60_000 - (Date.now() % 60_000) + 50;
    const timeout = window.setTimeout(() => {
      setNow(new Date());
      interval = window.setInterval(() => setNow(new Date()), 60_000);
    }, delay);
    return () => {
      window.clearTimeout(timeout);
      if (interval !== undefined) window.clearInterval(interval);
    };
  }, []);

  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];
  const dateStr = `${now.getMonth() + 1}/${now.getDate()} (${weekdays[now.getDay()]})`;
  const hours = String(now.getHours()).padStart(2, "0");
  const minutes = String(now.getMinutes()).padStart(2, "0");

  return { dateStr, hours, minutes };
}

export function Header() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { dateStr, hours, minutes } = useCurrentTime();

  const [selectedClip, setSelectedClip] = useState<ClipsResponse | null>(null);
  const [showClipModal, setShowClipModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TasksResponse | null>(null);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [launcherMessage, setLauncherMessage] = useState("");

  useEffect(() => {
    if (!launcherMessage) return;
    const timer = window.setTimeout(() => setLauncherMessage(""), 2500);
    return () => window.clearTimeout(timer);
  }, [launcherMessage]);

  async function handleOmniSelect(result: OmniSearchResult) {
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
        navigate({
          to: "/gtd/$projectid",
          params: { projectid: result.data.id },
          search: { returnTo: "active" },
        });
        break;
      case "launcher":
        await launchItem(result.data.id);
        setLauncherMessage(`${result.data.name} を起動しました。`);
        break;
    }
  }

  const navItems = [
    { to: "/", icon: Home, label: "HOME" },
    { to: "/gtd", icon: ListTodo, label: "GTD" },
    { to: "/clips", icon: Paperclip, label: "CLIPS" },
    { to: "/launcher", icon: Rocket, label: "LAUNCHER" },
  ];

  return (
    <>
      {launcherMessage && <div className="launcher-header-status" role="status"><Rocket size={14} />{launcherMessage}</div>}
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

            {/* 右: 日時 + ログアウト */}
            <div className="app-header-right">
              <ClockTools dateStr={dateStr} hours={hours} minutes={minutes} />
              <Link
                to="/login"
                search={{ redirect: pathname }}
                className="app-header-logout"
                title="ログアウト"
                aria-label="ログアウト"
              >
                <LogOut size={17} />
              </Link>
            </div>
          </div>
        </Container>
        <ClipRegister />
      </header>

      {/* Clip Detail Modal */}
      {selectedClip && (
        <ClipDetailModal
          clip={selectedClip}
          show={showClipModal}
          onClose={() => {
            setShowClipModal(false);
            setSelectedClip(null);
          }}
        />
      )}

      {/* Task Edit Modal */}
      {selectedTask && (
        <TaskEditModal
          task={selectedTask}
          show={showTaskModal}
          onClose={() => {
            setShowTaskModal(false);
            setSelectedTask(null);
          }}
        />
      )}
    </>
  );
}

export default Header;
