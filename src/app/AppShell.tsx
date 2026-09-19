import { useState, type ReactNode } from 'react';

export interface AppShellNavItem {
  id: string;
  label: string;
  hint?: string;
}

interface AppShellProps {
  children: ReactNode;
  activeSection?: string;
  navItems?: AppShellNavItem[];
  onNavigate?(sectionId: string): void;
}

const DEFAULT_NAV: AppShellNavItem[] = [
  { id: 'sessions', label: 'Sessions', hint: 'Configure and run a test' },
];

export function AppShell({
  children,
  activeSection = 'sessions',
  navItems = DEFAULT_NAV,
  onNavigate,
}: AppShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="app-frame">
      <a className="skip-link" href="#main-content">
        Skip to content
      </a>

      <aside className={`app-sidebar${mobileOpen ? ' mobile-open' : ''}`}>
        <div className="product-lockup">
          <span className="product-mark" aria-hidden="true">
            E
          </span>
          <span>
            <strong>Exam Studio</strong>
            <small>Practice workspace</small>
          </span>
        </div>

        <nav className="primary-nav" aria-label="Primary navigation">
          <span className="nav-label">Workspace</span>
          {navItems.map((item) => (
            <button
              type="button"
              key={item.id}
              className={item.id === activeSection ? 'active' : ''}
              aria-current={item.id === activeSection ? 'page' : undefined}
              onClick={() => {
                onNavigate?.(item.id);
                setMobileOpen(false);
              }}
            >
              <span className="nav-icon" aria-hidden="true">
                {item.label.slice(0, 1)}
              </span>
              <span className="nav-copy">
                <strong>{item.label}</strong>
                {item.hint ? <small>{item.hint}</small> : null}
              </span>
            </button>
          ))}
        </nav>

        <div className="sidebar-status">
          <span className="status-dot" aria-hidden="true" />
          <span>
            <strong>Saved on this device</strong>
            <small>Tests and practice attempts</small>
          </span>
        </div>
      </aside>

      {mobileOpen ? (
        <button
          type="button"
          className="nav-scrim"
          aria-label="Close navigation"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <div className="app-workspace">
        <header className="app-topbar">
          <div className="topbar-leading">
            <button
              type="button"
              className="mobile-menu-button"
              aria-label="Toggle navigation"
              aria-expanded={mobileOpen}
              onClick={() => setMobileOpen((open) => !open)}
            >
              <span aria-hidden="true">☰</span>
            </button>
            <div className="topbar-context">
              <span>Test workspace</span>
              <strong>Session setup</strong>
            </div>
          </div>
          <div className="topbar-status" title="Changes are saved locally first">
            <span className="status-dot" aria-hidden="true" />
            Device workspace
          </div>
        </header>

        <main id="main-content" className="app-content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
