import { Link, useLocation } from "@tanstack/react-router"
import { Container, Stack } from "react-bootstrap"
import { LogOut } from 'lucide-react'
import { ClipComposer } from './ClipComposer'

export function Header() {
    const { pathname } = useLocation()

    return (
        <>
          <Container className="border-bottom py-2">
            <Stack direction="horizontal" gap={4} className="mt-2">
              <h1 className="h5 fw-bold text-secondary">
                  <Link to="/">Things</Link>
              </h1>
              <Link to="/" className={pathname === '/' ? 'ms-auto active_menu' : 'ms-auto'}>HOME</Link>
              <Link to="/clips" className={pathname === '/clips' ? 'active_menu' : ''}>
                CLIPS
              </Link>
              <Link to="/gtd" className={pathname === '/gtd' ? 'active_menu' : ''}>
                GTD
              </Link>
              <Link to="/settings" className={pathname === '/settings' ? 'active_menu' : ''}>
                SETTINGS
              </Link>
               <Link to="/login" search={{ redirect: window.location.pathname }}>
                <LogOut size={18} className="text-danger" />
              </Link>
            </Stack>
            <ClipComposer />
          </Container>
        </>
    )
}

export default Header
