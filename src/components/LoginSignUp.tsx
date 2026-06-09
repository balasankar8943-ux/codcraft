// src/components/LoginSignUp.tsx
import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { useNavigate } from 'react-router-dom';

const LoginSignUp: React.FC = () => {
  const { signIn, signUp, signInWithGoogle, user } = useAuth();
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(email, password);
        setSuccess('Logged in successfully!');
        setTimeout(() => navigate('/'), 1000);
      } else {
        await signUp(email, password);
        setSuccess('Account created! Please check your email for confirmation (if enabled) or log in.');
        setIsLogin(true);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    // Already logged in – redirect handled by router
    return null;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '1rem',
      position: 'relative'
    }}>
      <div className="glass-card" style={{
        width: '100%',
        maxWidth: '900px',
        padding: '0',
        display: 'grid',
        gridTemplateColumns: '1fr 1.1fr',
        overflow: 'hidden'
      }}>
        {/* Visual Brand Side */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(147, 51, 234, 0.2) 0%, rgba(20, 184, 166, 0.2) 100%)',
          borderRight: '1px solid rgba(255, 255, 255, 0.05)',
          padding: '3rem 2rem',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          position: 'relative',
          overflow: 'hidden'
        }} className="brand-section">
          {/* Neon background circle decor */}
          <div style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'var(--primary)',
            filter: 'blur(90px)',
            opacity: '0.15',
            top: '-20px',
            left: '-20px'
          }} />
          <div style={{
            position: 'absolute',
            width: '200px',
            height: '200px',
            borderRadius: '50%',
            background: 'var(--secondary)',
            filter: 'blur(90px)',
            opacity: '0.15',
            bottom: '-20px',
            right: '-20px'
          }} />

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.5rem' }}>
              <span style={{
                fontSize: '1.5rem',
                background: 'var(--primary)',
                color: '#fff',
                padding: '0.3rem 0.7rem',
                borderRadius: '8px',
                fontWeight: '800',
                boxShadow: '0 0 15px var(--primary-glow)'
              }}>&lt;/&gt;</span>
              <h2 style={{ fontSize: '1.8rem', letterSpacing: '-0.03em' }}>CodCraft</h2>
            </div>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '900',
              lineHeight: '1.15',
              margin: '0 0 1rem 0',
              background: 'linear-gradient(to right, #ffffff, var(--primary-light))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              textAlign: 'left'
            }}>
              Kerala's Coding Playground.
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1.05rem', maxWidth: '320px', textAlign: 'left' }}>
              Master your programming skills, track your progress, tackle MNC questions, and climb the leaderboard.
            </p>
          </div>

          <div style={{ marginTop: '2rem', fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Powering engineering minds. <br />
            <span>Built by </span>
            <a href="https://yantrixa.in" target="_blank" rel="noopener noreferrer" className="yantrixa-link">yantrixa.in</a>
          </div>
        </div>

        {/* Authentication Form Side */}
        <div style={{ padding: '3rem 2.5rem', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <div style={{ marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.6rem', marginBottom: '0.25rem' }}>
              {isLogin ? 'Welcome Back!' : 'Get Started'}
            </h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
              {isLogin ? 'Enter your credentials to access your dashboard.' : 'Sign up to begin your coding trajectory.'}
            </p>
          </div>

          {error && (
            <div className="toast-error" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
              <span>⚠️</span>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>{error}</p>
            </div>
          )}

          {success && (
            <div className="toast-success" style={{ marginBottom: '1rem', padding: '0.75rem 1rem' }}>
              <span>✅</span>
              <p style={{ fontSize: '0.85rem', margin: 0 }}>{success}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>Email Address</label>
              <input
                className="input"
                type="email"
                placeholder="you@college.edu"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.4rem', fontWeight: '500' }}>Password</label>
              <input
                className="input"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <button className="btn" type="submit" style={{ width: '100%', marginTop: '0.5rem' }} disabled={loading}>
              {loading ? 'Processing...' : isLogin ? 'Sign In' : 'Create Account'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0', gap: '0.5rem' }}>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>or</span>
            <div style={{ flex: 1, height: '1px', background: 'rgba(255, 255, 255, 0.08)' }} />
          </div>

          <button
            className="btn btn-secondary"
            onClick={signInWithGoogle}
            style={{ width: '100%' }}
            disabled={loading}
            type="button"
          >
            <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24">
              <path
                d="M21.35 11.1h-9.17v2.73h6.51c-.33 1.56-1.56 2.95-3.18 3.5v2.88h5.13c3.01-2.77 4.72-6.86 4.72-11.67c0-.5-.04-1.0-.12-1.44z"
                fill="#4285F4"
              />
              <path
                d="M12.18 21.43c2.75 0 5.06-.91 6.75-2.46l-5.13-2.88c-.79.53-1.8.85-2.94.85c-2.88 0-5.3-1.93-6.18-4.54H1.4v2.99c1.73 3.44 5.3 5.76 9.4 5.76z"
                fill="#34A853"
              />
              <path
                d="M6 12.4c-.22-.66-.35-1.37-.35-2.09c0-.72.13-1.43.35-2.09V5.23H1.4A11.978 11.978 0 0 0 0 10.31c0 1.83.4 3.56 1.4 5.08L6 12.4z"
                fill="#FBBC05"
              />
              <path
                d="M12.18 4.73c1.49 0 2.84.51 3.9 1.51l2.92-2.92C17.22 1.76 14.9 1 12.18 1C8.08 1 4.51 3.32 2.78 6.76l4.6 2.99c.88-2.61 3.3-4.54 6.8-4.54z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            {isLogin ? "New to CodCraft?" : 'Already have an account?'}{' '}
            <span
              style={{ color: 'var(--primary-light)', cursor: 'pointer', fontWeight: '600' }}
              onClick={() => {
                setIsLogin(!isLogin);
                setError(null);
                setSuccess(null);
              }}
            >
              {isLogin ? 'Create one now' : 'Sign In'}
            </span>
          </p>
        </div>
      </div>

      {/* Add mobile responsiveness hacks */}
      <style>{`
        @media (max-width: 768px) {
          .glass-card {
            grid-template-columns: 1fr !important;
          }
          .brand-section {
            padding: 2rem 1.5rem !important;
            border-right: none !important;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05) !important;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginSignUp;
