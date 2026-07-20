import { Link } from "@tanstack/react-router"
import { Container, Stack } from "react-bootstrap"
import { LogOut } from 'lucide-react'

export function Header() {
    return (
        <>
          <Container className="border-bottom py-2">
            <Stack direction="horizontal" gap={4} className="mt-2">
              <h1 className="h5 fw-bold text-secondary">
                  <Link to="/">Things</Link>
              </h1>
              <Link className="ms-auto" to="/gtd">GTD</Link>
              <Link to="/notes">NOTES</Link>
              <Link to="/files">FILES</Link>
              <Link to="/login" search={{ redirect: window.location.pathname }}>
                <LogOut size={18} className="text-danger" />
              </Link>
            </Stack>
          </Container>
        </>
    )
}

export default Header
