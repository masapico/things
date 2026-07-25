import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Button, Container, Form } from "react-bootstrap";
import { pb } from "../lib/pocketbase";
import { LogIn, Mail, KeyRound, AlertCircle } from "lucide-react";
import "./login.css";

export const Route = createFileRoute("/login")({
  validateSearch: (search: Record<string, unknown>) => ({
    redirect: typeof search.redirect === "string" ? search.redirect : undefined,
  }),
  component: LoginPage,
});

function LoginPage() {
  pb.authStore.clear();

  const navigate = useNavigate();
  const search = Route.useSearch();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await pb.collection("users").authWithPassword(email, password);
      navigate({
        to: search.redirect ?? "/",
      });
    } catch (err) {
      console.error(err);
      pb.authStore.clear();
      setError("ログイン情報が正しくありません。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Container className="d-flex justify-content-center align-items-center vh-100">
      <div className="login-box">
        {/* アイコン */}
        <div className="login-icon">
          <LogIn size={28} />
        </div>

        {/* エラー */}
        {error && (
          <div className="login-error">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}

        {/* フォーム */}
        <Form onSubmit={handleSubmit} className="login-form">
          <Form.Group className="login-field">
            <div className="login-field-icon">
              <Mail size={16} />
            </div>
            <Form.Control
              type="email"
              value={email}
              autoComplete="username"
              placeholder="メールアドレス"
              onChange={(e) => setEmail(e.target.value)}
              required
              className="login-input"
            />
          </Form.Group>

          <Form.Group className="login-field">
            <div className="login-field-icon">
              <KeyRound size={16} />
            </div>
            <Form.Control
              type="password"
              value={password}
              autoComplete="current-password"
              placeholder="パスワード"
              onChange={(e) => setPassword(e.target.value)}
              required
              className="login-input"
            />
          </Form.Group>

          <Button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? "ログイン中..." : "ログイン"}
          </Button>
        </Form>
      </div>
    </Container>
  );
}