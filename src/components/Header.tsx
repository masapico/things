import { Link, useLocation } from "@tanstack/react-router"
import { Container, Form, InputGroup, Stack } from "react-bootstrap"
import { LogOut, ScanSearch } from 'lucide-react'
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
              <div className="ms-auto">
                  <InputGroup size="sm" className="flex-grow-1">
                      <InputGroup.Text id="omniSearch">
                          <ScanSearch size={16} />
                      </InputGroup.Text>
                      <Form.Control
                        aria-label="omniSearch"
                        aria-describedby="omniSearch"
                      />
                  </InputGroup>
              </div>
              <Link to="/" className={pathname === '/' ? 'active_menu' : ''}>HOME</Link>
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
