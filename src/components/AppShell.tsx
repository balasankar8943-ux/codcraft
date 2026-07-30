// src/components/AppShell.tsx
// Shared header + mobile drawer used by every page.
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthProvider';

const NAV = [
  { path: '/',             label: 'Practice Arena',  icon: '💻' },
  { path: '/compiler',     label: 'Cloud IDE',       icon: '⚡' },
  { path: '/mnc',          label: 'MNC Prep',         icon: '🏢' },
  { path: '/leaderboard',  label: 'Leaderboard',      icon: '🏆' },
  { path: '/certificates', label: 'My Certificates',  icon: '🎓' },
];

interface Props {
  xp?: number;
  children: React.ReactNode;
}

const AppShell: React.FC<Props> = ({ xp = 0, children }) => {
  const { user, signOut } = useAuth();
  const navigate   = useNavigate();
  const location   = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isAdmin = user?.email?.toLowerCase().includes('admin') || 
                  user?.email?.toLowerCase().includes('yantrixa') || 
                  user?.email === 'balasankar8943@gmail.com';

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', overflowX: 'hidden' }}>

      {/* ── Sticky Header ─────────────────────────────────── */}
      <header className="app-header">
        {/* Logo */}
        <div className="app-header-logo" onClick={() => navigate('/')}>
          <img src={`${import.meta.env.BASE_URL}yantrixa-logo.png`} alt="Yantrixa" width="34" height="34" />
          <span className="name">CodCraft</span>
          <span className="ktu-tag">KTU</span>
        </div>

        {/* Desktop Nav */}
        <nav className="desktop-only" style={{ display: 'flex', gap: '0.25rem' }}>
          {NAV.map(n => (
            <button
              key={n.path}
              onClick={() => navigate(n.path)}
              className={`desktop-nav-btn${isActive(n.path) ? ' active' : ''}`}
            >
              <span>{n.icon}</span> {n.label}
            </button>
          ))}
          {isAdmin && (
            <button
              onClick={() => navigate('/admin-notifications')}
              className={`desktop-nav-btn${isActive('/admin-notifications') ? ' active' : ''}`}
              style={{ border: '1px dashed var(--indigo)', borderRadius: '6px' }}
            >
              <span>📢</span> Broadcast
            </button>
          )}
        </nav>

        {/* Right side */}
        <div className="app-header-right">
          {/* XP chip — desktop only */}
          <div className="streak-chip desktop-only" style={{ background: 'var(--indigo-bg)', borderColor: '#c7d2fe', color: 'var(--indigo)' }}>
            <span>⚡</span>
            <span>Lv.{Math.floor(xp / 100) + 1}</span>
            <span style={{ color: 'var(--muted)', margin: '0 0.15rem' }}>·</span>
            <span>{xp} XP</span>
          </div>

          {/* Logout — desktop only */}
          <button className="btn btn-ghost btn-sm desktop-only" onClick={() => signOut()}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            Logout
          </button>

          {/* Hamburger — mobile only */}
          <button className="hamburger-btn" onClick={() => setMenuOpen(true)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="3" y1="6" x2="21" y2="6"/>
              <line x1="3" y1="12" x2="21" y2="12"/>
              <line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
        </div>
      </header>

      {/* ── Mobile Drawer ──────────────────────────────────── */}
      {menuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(3px)' }}
          onClick={() => setMenuOpen(false)}
        >
          <div
            style={{
              position: 'absolute', top: 0, right: 0, bottom: 0,
              width: 'min(300px, 85vw)',
              background: 'var(--bg2)', borderLeft: '1px solid var(--border)',
              display: 'flex', flexDirection: 'column', padding: '1.5rem 1.25rem',
              overflowY: 'auto',
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text)' }}>Menu</span>
              <button className="btn btn-ghost btn-sm" onClick={() => setMenuOpen(false)} style={{ padding: '0.35rem' }}>✕</button>
            </div>

            {/* User info */}
            <div style={{ padding: '0.75rem', background: 'var(--bg)', borderRadius: 'var(--radius)', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.2rem' }}>Signed in as</p>
              <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text)', wordBreak: 'break-all' }}>{user?.email}</p>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <span style={{ fontSize: '0.72rem', background: 'var(--indigo-bg)', color: 'var(--indigo)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
                  ⚡ Lv.{Math.floor(xp / 100) + 1}
                </span>
                <span style={{ fontSize: '0.72rem', background: 'var(--indigo-bg)', color: 'var(--indigo)', padding: '0.2rem 0.6rem', borderRadius: '20px', fontWeight: 700 }}>
                  {xp} XP
                </span>
              </div>
            </div>

            {/* Nav links */}
            <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
              {NAV.map(n => (
                <button
                  key={n.path}
                  onClick={() => { navigate(n.path); setMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                    border: 'none', background: isActive(n.path) ? 'var(--indigo-bg)' : 'transparent',
                    color: isActive(n.path) ? 'var(--indigo)' : 'var(--text2)',
                    fontFamily: 'var(--font)', fontSize: '0.9rem', fontWeight: isActive(n.path) ? 700 : 500,
                    cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)',
                    borderLeft: isActive(n.path) ? '3px solid var(--indigo)' : '3px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>{n.icon}</span>
                  {n.label}
                </button>
              ))}
              {isAdmin && (
                <button
                  onClick={() => { navigate('/admin-notifications'); setMenuOpen(false); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.75rem',
                    padding: '0.75rem 1rem', borderRadius: 'var(--radius-sm)',
                    border: '1px dashed var(--indigo)', background: isActive('/admin-notifications') ? 'var(--indigo-bg)' : 'transparent',
                    color: isActive('/admin-notifications') ? 'var(--indigo)' : 'var(--text2)',
                    fontFamily: 'var(--font)', fontSize: '0.9rem', fontWeight: isActive('/admin-notifications') ? 700 : 500,
                    cursor: 'pointer', textAlign: 'left', transition: 'var(--transition)',
                    borderLeft: isActive('/admin-notifications') ? '3px solid var(--indigo)' : '3px solid transparent',
                  }}
                >
                  <span style={{ fontSize: '1.1rem' }}>📢</span>
                  Broadcast Alerts
                </button>
              )}
            </nav>

            {/* Logout */}
            <button
              onClick={() => { signOut(); setMenuOpen(false); }}
              style={{
                marginTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.5rem', padding: '0.7rem', borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)', background: 'transparent',
                color: 'var(--danger)', fontFamily: 'var(--font)', fontSize: '0.85rem',
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              🚪 Sign Out
            </button>
          </div>
        </div>
      )}

      {/* ── Page Content ───────────────────────────────────── */}
      <main style={{ flex: 1 }}>
        {children}
      </main>

      {/* ── Footer ─────────────────────────────────────────── */}
      <footer className="app-footer">
        <img src={`${import.meta.env.BASE_URL}yantrixa-logo.png`} alt="Yantrixa" />
        CodCraft © 2026 · KTU Curriculum Aligned ·
        Built by <a href="https://yantrixa.in" target="_blank" rel="noopener noreferrer">yantrixa.in</a>
      </footer>
    </div>
  );
};

export default AppShell;
