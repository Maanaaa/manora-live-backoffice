import { useState } from 'react';
import { NavLink, Outlet } from 'react-router';
import { useAuth } from '../auth/AuthContext';
import logo from '../assets/manora-logo.png';
import { useLive } from '../live/LiveContext';
import { ConnectionIndicator } from './Badges';

const NAV = [
  { to: '/', label: 'Tableau de bord', end: true },
  { to: '/parc', label: 'Parc' },
  { to: '/regles', label: 'Règles' },
  { to: '/utilisateurs', label: 'Utilisateurs' },
  { to: '/journal', label: 'Journal' },
  { to: '/cles', label: 'Clés des bornes' },
];

export function Layout() {
  const { user, logout } = useAuth();
  const { connection } = useLive();
  const [open, setOpen] = useState(false);

  return (
    <div className="shell">
      <a className="skip-link" href="#contenu">
        Aller au contenu
      </a>
      <header className="sidebar">
        <div className="sidebar-top">
          <img src={logo} alt="Manora" className="logo" />
          <button
            type="button"
            className="btn btn-ghost menu-toggle"
            aria-expanded={open}
            aria-controls="navigation"
            onClick={() => setOpen((o) => !o)}
          >
            Menu
          </button>
        </div>
        <p className="sidebar-subtitle">Live · back-office</p>
        <nav id="navigation" aria-label="Navigation principale" className={open ? 'nav nav-open' : 'nav'}>
          {NAV.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className="nav-link" onClick={() => setOpen(false)}>
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <ConnectionIndicator connection={connection} />
          <p className="user">
            <strong>{user?.name}</strong>
            <span className="muted">{user?.email}</span>
          </p>
          <button type="button" className="btn btn-secondary" onClick={logout}>
            Se déconnecter
          </button>
        </div>
      </header>
      <main id="contenu" className="content" tabIndex={-1}>
        <Outlet />
      </main>
    </div>
  );
}

export function PageHeader({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="page-header">
      <h1>{title}</h1>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}
