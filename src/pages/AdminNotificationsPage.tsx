// src/pages/AdminNotificationsPage.tsx
import React, { useState } from 'react';
import { useAuth } from '../components/AuthProvider';
import AppShell from '../components/AppShell';

const AdminNotificationsPage: React.FC = () => {
  const { user } = useAuth();
  
  const [title, setTitle] = useState('New Coding Challenge Alert! ⚡');
  const [message, setMessage] = useState('A new syllabus-aligned practice set is live. Click to solve and level up your track!');
  const [targetUrl, setTargetUrl] = useState('https://codcraft.in');
  
  const [appId, setAppId] = useState(import.meta.env.VITE_ONESIGNAL_APP_ID || '');
  const [apiKey, setApiKey] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!appId || !apiKey || !title || !message) {
      setError('Please fill in all required fields (App ID, API Key, Title, and Message).');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('https://onesignal.com/api/v1/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Authorization': `Basic ${apiKey}`,
        },
        body: JSON.stringify({
          app_id: appId,
          headings: { en: title },
          contents: { en: message },
          url: targetUrl,
          included_segments: ['All'], // Send to all registered subscribers
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Notification sent successfully! (ID: ${data.id}, Recipients: ${data.recipients || 'all registered'})`);
        setMessage(''); // Reset message
      } else {
        throw new Error(data.errors?.[0] || 'Failed to send notification via OneSignal API.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'An error occurred while connecting to the OneSignal API.');
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.email?.toLowerCase().includes('admin') || 
                  user?.email?.toLowerCase().includes('yantrixa') || 
                  user?.email === 'balasankar8943@gmail.com';

  if (!isAdmin) {
    return (
      <AppShell xp={0}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: 'var(--text)', textAlign: 'center', padding: '2rem' }}>
          <span style={{ fontSize: '3rem' }}>🔒</span>
          <h2 style={{ fontSize: '1.25rem', marginTop: '1rem', fontWeight: 800 }}>Access Denied</h2>
          <p style={{ color: 'var(--muted)', fontSize: '0.85rem', marginTop: '0.5rem', maxWidth: '340px' }}>
            Only administrators are authorized to broadcast push notifications to registered students.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell xp={0}>
      <div className="dashboard-layout" style={{ gridTemplateColumns: '1fr', maxWidth: '800px', marginInline: 'auto' }}>
        <div className="main-col">
          
          <div style={{ marginBottom: '1.5rem' }}>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              📢 Broadcast Push Notifications
            </h1>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', marginTop: '0.35rem', lineHeight: 1.6 }}>
              Send real-time push alerts directly to the lockscreens and desktops of registered students, even when they are offline or away from the platform.
            </p>
          </div>

          {/* Form Card */}
          <div className="card card-p" style={{ background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <form onSubmit={handleSendNotification} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              
              {/* Credentials Section */}
              <div style={{ paddingBottom: '1rem', borderBottom: '1px solid var(--border)' }}>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>🔐 OneSignal Credentials</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>OneSignal App ID *</label>
                    <input
                      type="text"
                      className="input"
                      placeholder="e.g. abcde123-4567-890a-bcde-f123456789ab"
                      value={appId}
                      onChange={e => setAppId(e.target.value)}
                      required
                      style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>REST API Key *</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="••••••••••••••••••••••••••••••••"
                      value={apiKey}
                      onChange={e => setApiKey(e.target.value)}
                      required
                      style={{ fontSize: '0.8rem', padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                </div>
                <p style={{ fontSize: '0.68rem', color: 'var(--muted2)', marginTop: '0.5rem', lineHeight: 1.3 }}>
                  Your REST API Key is processed securely in memory and never stored in the database. Find it in your <strong>OneSignal Dashboard &gt; Settings &gt; Keys &amp; IDs</strong>.
                </p>
              </div>

              {/* Notification Content */}
              <div>
                <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>📝 Notification Content</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Notification Title *</label>
                    <input
                      type="text"
                      className="input"
                      value={title}
                      onChange={e => setTitle(e.target.value)}
                      required
                      placeholder="e.g. Weekly Contest Live!"
                      style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Message Body *</label>
                    <textarea
                      className="input"
                      value={message}
                      onChange={e => setMessage(e.target.value)}
                      required
                      rows={3}
                      placeholder="Enter the push notification message..."
                      style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem', resize: 'vertical', fontFamily: 'var(--font)' }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Launch URL (Optional)</label>
                    <input
                      type="url"
                      className="input"
                      value={targetUrl}
                      onChange={e => setTargetUrl(e.target.value)}
                      placeholder="https://codcraft.in"
                      style={{ fontSize: '0.82rem', padding: '0.5rem 0.75rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Alerts */}
              {error && <div className="alert alert-error" style={{ fontSize: '0.8rem' }}>⚠️ {error}</div>}
              {success && <div className="alert alert-success" style={{ fontSize: '0.8rem' }}>✓ {success}</div>}

              {/* Action Button */}
              <button
                type="submit"
                className="btn btn-primary"
                disabled={loading}
                style={{ width: '100%', padding: '0.75rem 1.5rem', fontWeight: 700 }}
              >
                {loading ? 'Broadcasting Notification...' : '🚀 Broadcast Push Notification'}
              </button>

            </form>
          </div>

          {/* Guide Section */}
          <div className="card card-p" style={{ marginTop: '1.5rem', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)' }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 700, marginBottom: '0.75rem', color: 'var(--text)' }}>📖 Administrator Setup Guide</h3>
            <ol style={{ fontSize: '0.75rem', color: 'var(--muted)', paddingLeft: '1.25rem', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li>Create a free account on <a href="https://onesignal.com" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--indigo)' }}>onesignal.com</a>.</li>
              <li>Add a new Web Push app and configure your site domain (e.g. <code>https://codcraft.in</code>).</li>
              <li>Provide your OneSignal <strong>App ID</strong> as an environment variable in your host environment or paste it above.</li>
              <li>Ensure <code>OneSignalSDKWorker.js</code> is active in the repository (already automatically set up by your development team).</li>
              <li>Registered students will be automatically prompted for push permissions when they load the platform. Once they accept, they will receive notifications here instantly!</li>
            </ol>
          </div>

        </div>
      </div>
    </AppShell>
  );
};

export default AdminNotificationsPage;
