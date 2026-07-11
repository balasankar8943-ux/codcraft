import React, { useState, useEffect } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

const LoginSignUp: React.FC = () => {
  const { signIn, signUp, user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin]   = useState(true);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);
  const [success, setSuccess]   = useState<string | null>(null);
  const [subState, setSubState] = useState<'default' | 'granted' | 'denied' | 'checking'>('checking');

  useEffect(() => {
    let active = true;
    const checkPermission = () => {
      const OneSignal = (window as any).OneSignal;
      if (OneSignal && OneSignal.Notifications) {
        if (active) setSubState(OneSignal.Notifications.permission);
      } else {
        setTimeout(() => {
          if (active) checkPermission();
        }, 1000);
      }
    };
    checkPermission();
    return () => { active = false; };
  }, []);

  const handleSubscribe = async () => {
    const OneSignal = (window as any).OneSignal;
    if (OneSignal && OneSignal.Notifications) {
      try {
        await OneSignal.Notifications.requestPermission();
        setSubState(OneSignal.Notifications.permission);
      } catch (err) {
        console.error('Subscription error:', err);
      }
    }
  };

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); setSuccess(null); setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        setSuccess('Logged in! Redirecting…');
        setTimeout(() => navigate('/'), 900);
      } else {
        await signUp(email, password);
        setSuccess('Account created! Signing you in…');
        setTimeout(async () => {
          try { await signIn(email, password); navigate('/'); }
          catch { setIsLogin(true); setSuccess(null); }
        }, 1400);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please try again.');
    } finally { setLoading(false); }
  };

  if (user) return null;

  return (
    <div className="login-page">

      {/* ─── Left Art Panel ─────────────────────────────────── */}
      <div className="login-art-panel">
        <img
          src={`${import.meta.env.BASE_URL}login-art.png`}
          alt="Student coding illustration"
          className="login-art-img"
          width="380"
          height="380"
        />

        <div className="login-art-text">
          <h2>Built for KTU Students</h2>
          <p>Practice KTU syllabus-aligned coding questions and get promoted through adaptive tiers.</p>
        </div>

        <div className="login-art-features">
          <div className="login-art-feature">
            <div className="login-art-feature feat-icon" style={{ background:'#eef2ff', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🎯</div>
            <span>Adaptive skill tracking</span>
          </div>
          <div className="login-art-feature">
            <div style={{ background:'#fffbeb', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🏆</div>
            <span>Earn certificates by tier</span>
          </div>
          <div className="login-art-feature">
            <div style={{ background:'#ecfdf5', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🔥</div>
            <span>Daily streak & XP system</span>
          </div>
          <div className="login-art-feature">
            <div style={{ background:'#fdf4ff', borderRadius:'8px', width:'30px', height:'30px', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>🏢</div>
            <span>MNC placement prep</span>
          </div>
        </div>
      </div>

      {/* ─── Right Form Panel ────────────────────────────────── */}
      <div className="login-form-panel">
        <div className="login-form-inner">

          {/* Brand */}
          <div className="login-brand">
            <img src={`${import.meta.env.BASE_URL}yantrixa-logo.png`} alt="Yantrixa" width="38" height="38" />
            <span className="login-brand-name">CodCraft</span>
            <span className="login-brand-tag">KTU</span>
          </div>

          {/* Title */}
          <div className="login-title">
            <h1>{isLogin ? 'Welcome back 👋' : 'Join CodCraft'}</h1>
            <p>{isLogin
              ? 'Sign in to continue your coding journey.'
              : 'Create a free account and start practising today.'}
            </p>
          </div>

          {/* Sign In / Register tabs */}
          <div className="auth-tabs">
            <button
              type="button"
              className={`auth-tab${isLogin ? ' active' : ''}`}
              onClick={() => { setIsLogin(true); setError(null); setSuccess(null); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>
                <polyline points="10 17 15 12 10 7"/>
                <line x1="15" y1="12" x2="3" y2="12"/>
              </svg>
              Sign In
            </button>
            <button
              type="button"
              className={`auth-tab${!isLogin ? ' active' : ''}`}
              onClick={() => { setIsLogin(false); setError(null); setSuccess(null); }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <line x1="19" y1="8" x2="19" y2="14"/>
                <line x1="22" y1="11" x2="16" y2="11"/>
              </svg>
              Register
            </button>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-error">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0,marginTop:'1px'}}>
                <circle cx="12" cy="12" r="10"/>
                <line x1="12" y1="8" x2="12" y2="12"/>
                <line x1="12" y1="16" x2="12.01" y2="16"/>
              </svg>
              {error}
            </div>
          )}
          {success && (
            <div className="alert alert-success">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" style={{flexShrink:0,marginTop:'1px'}}>
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              {success}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <div className="input-with-icon">
                <svg className="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/>
                  <polyline points="22,6 12,13 2,6"/>
                </svg>
                <input
                  type="email"
                  className="input"
                  placeholder="student@college.edu.in"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-with-icon">
                <svg className="icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                <input
                  type="password"
                  className="input"
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  minLength={6}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-full btn-lg"
              style={{ marginTop:'0.5rem' }}
            >
              {loading ? 'Please wait…' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          {/* Push Notifications subscription section */}
          <div className="login-notifications-box" style={{
            marginTop: '1.25rem',
            padding: '0.85rem 1rem',
            background: '#1a1a1f',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              <span style={{ fontSize: '1.25rem' }}>🔔</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>Push Alerts</div>
                <div style={{ fontSize: '0.68rem', color: 'var(--muted2)', marginTop: '0.1rem' }}>
                  Get challenge updates on your phone.
                </div>
              </div>
            </div>
            {subState === 'granted' ? (
              <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                ✓ Active
              </span>
            ) : subState === 'denied' ? (
              <span style={{ fontSize: '0.68rem', color: 'var(--danger)', fontWeight: 600 }} title="Reset permissions in your browser address bar.">
                ⚠️ Blocked
              </span>
            ) : (
              <button
                type="button"
                onClick={handleSubscribe}
                className="btn btn-outline btn-sm"
                style={{ fontSize: '0.72rem', padding: '0.3rem 0.6rem', border: '1px solid var(--indigo)', color: 'var(--indigo)' }}
              >
                Subscribe
              </button>
            )}
          </div>

          <div className="footer-note" style={{ marginTop: '1rem' }}>
            Secured by Supabase Auth · Built by{' '}
            <a href="https://yantrixa.in" target="_blank" rel="noopener noreferrer">yantrixa.in</a>
          </div>

        </div>
      </div>
    </div>
  );
};

export default LoginSignUp;
