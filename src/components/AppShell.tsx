import { Link, useLocation } from 'react-router-dom'
import { cn } from '../lib/utils'

interface Props {
  children: React.ReactNode
}

export default function AppShell({ children }: Props) {
  const loc = useLocation()

  return (
    <div className="min-h-screen flex flex-col bg-uw-bg text-uw-text">
      {/* Top nav */}
      <header className="h-14 flex items-center border-b border-uw-border px-6 shrink-0">
        <Link
          to="/submissions"
          className="flex items-center gap-2.5 mr-8 group"
        >
          {/* Wordmark */}
          <span className="flex h-7 w-7 items-center justify-center rounded bg-uw-accent text-white text-xs font-bold leading-none select-none">
            UW
          </span>
          <span className="font-semibold text-sm tracking-wide text-uw-text group-hover:text-white transition-colors">
            Hub
          </span>
          <span className="text-uw-muted text-xs hidden sm:inline">
            Underwriting Workbench
          </span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavItem to="/submissions" active={loc.pathname.startsWith('/submissions') && !loc.pathname.includes('/new')}>
            Submissions
          </NavItem>
          <NavItem to="/submissions/new" active={loc.pathname === '/submissions/new'}>
            + New
          </NavItem>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <span className="text-2xs text-uw-muted tabular">
            AI perceives · Rules decide
          </span>
          <span className="h-5 w-px bg-uw-border" />
          <span className="text-xs text-uw-muted">v0.1</span>
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  )
}

function NavItem({
  to,
  active,
  children,
}: {
  to: string
  active: boolean
  children: React.ReactNode
}) {
  return (
    <Link
      to={to}
      className={cn(
        'px-3 py-1.5 rounded text-sm transition-colors',
        active
          ? 'bg-uw-surface text-uw-text'
          : 'text-uw-muted hover:text-uw-text hover:bg-uw-surface/50',
      )}
    >
      {children}
    </Link>
  )
}
