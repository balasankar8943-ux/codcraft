// src/pages/IntegrityTestPage.tsx
import React, { useRef, useState } from 'react';
import AppShell from '../components/AppShell';
import { useIntegrityMonitor } from '../hooks/useIntegrityMonitor';
import { Shield, ShieldAlert, ShieldCheck, Camera, AlertTriangle, RefreshCw, Eye, EyeOff, UserX, Users } from 'lucide-react';

const IntegrityTestPage: React.FC = () => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [mockStream, setMockStream] = useState<MediaStream | null>(null);
  const [simulatedLuminance, setSimulatedLuminance] = useState<number>(120); // Normal light
  const [simulatedFaceCount, setSimulatedFaceCount] = useState<number>(1);   // 1 face
  const [simulatedTurnAway, setSimulatedTurnAway] = useState<boolean>(false);

  // Initialize Integrity Monitor with custom detector for test controls
  const {
    state,
    score,
    activeViolations,
    history,
    start,
    stop,
    reset,
    stateMachine
  } = useIntegrityMonitor({
    targetContainerRef: containerRef,
    config: {
      fps: 3,
      noFaceThresholdSec: 2.0,
      turnAwayThresholdSec: 2.0,
      disqualifyScoreThreshold: 40.0
    },
    customDetector: () => {
      return {
        faceCount: simulatedFaceCount,
        isTurnedAway: simulatedTurnAway,
        meanLuminance: simulatedLuminance
      };
    }
  });

  // Handle webcam start
  const handleStartCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
      setMockStream(stream);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
      start(stream, videoRef.current || undefined);
    } catch (err) {
      // If camera unavailable or denied, trigger error state
      start();
      if (stateMachine) stateMachine.transitionToError('Camera permission denied or camera device missing');
    }
  };

  // Stop camera
  const handleStopCamera = () => {
    if (mockStream) {
      mockStream.getTracks().forEach(t => t.stop());
      setMockStream(null);
    }
    setCameraActive(false);
    stop();
  };

  const getStatusBadge = () => {
    switch (state) {
      case 'OK':
        return <span className="badge badge-green" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}><ShieldCheck size={16} /> OK · Clean Feed</span>;
      case 'WARNING':
        return <span className="badge badge-yellow" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}><AlertTriangle size={16} /> WARNING · Anomaly Detected</span>;
      case 'VIOLATION':
        return <span className="badge badge-red" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}><ShieldAlert size={16} /> VIOLATION ACTIVE</span>;
      case 'DISQUALIFY_PENDING':
        return <span className="badge" style={{ background: '#450a0a', color: '#f87171', border: '1px solid #dc2626', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem', fontWeight: 800 }}><ShieldAlert size={16} /> ⛔ DISQUALIFY PENDING</span>;
      case 'ERROR':
        return <span className="badge" style={{ background: '#7f1d1d', color: '#fca5a5', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>❌ CAMERA / SYSTEM ERROR</span>;
      default:
        return <span className="badge" style={{ background: 'var(--bg3)', color: 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.85rem', padding: '0.4rem 0.8rem' }}>● Standby ({state})</span>;
    }
  };

  const getScoreColor = () => {
    if (score > 80) return 'var(--success)';
    if (score > 50) return 'var(--gold2)';
    return 'var(--danger)';
  };

  return (
    <AppShell xp={120}>
      <div ref={containerRef} style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        
        {/* Header */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
              <Shield size={24} style={{ color: 'var(--indigo)' }} />
              <h1 style={{ fontSize: '1.35rem', fontWeight: 900, margin: 0 }}>
                On-Device Integrity Monitoring Engine
              </h1>
              <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>Client-Side AI Module</span>
            </div>
            <p style={{ fontSize: '0.82rem', color: 'var(--muted)', margin: 0 }}>
              Isolated webcam integrity engine. Performs client-side frame checks (~3 fps) with zero video streaming.
            </p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {!cameraActive ? (
              <button onClick={handleStartCamera} className="btn btn-primary btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Camera size={16} /> Start Camera Monitor
              </button>
            ) : (
              <button onClick={handleStopCamera} className="btn btn-outline btn-sm" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', color: 'var(--danger)' }}>
                Stop Monitor
              </button>
            )}
            <button onClick={reset} className="btn btn-ghost btn-sm" title="Reset State Machine">
              <RefreshCw size={15} /> Reset
            </button>
          </div>
        </div>

        {/* Top Status & Integrity Score Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              Current State Machine Status
            </span>
            <div>{getStatusBadge()}</div>
          </div>

          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1.1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                Cumulative Integrity Score
              </span>
              <span style={{ fontFamily: 'var(--mono)', fontWeight: 800, fontSize: '1.2rem', color: getScoreColor() }}>
                {score.toFixed(1)} / 100
              </span>
            </div>

            <div style={{ width: '100%', height: '10px', background: 'var(--bg3)', borderRadius: '5px', overflow: 'hidden' }}>
              <div style={{ width: `${Math.max(0, Math.min(100, score))}%`, height: '100%', background: getScoreColor(), transition: 'width 0.3s' }} />
            </div>

            <span style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
              Disqualification Trigger: ≤ 40.0 pts · Recovers +1 pt per 5s of clean feed
            </span>
          </div>
        </div>

        {/* Main Workspace: Video Feed & Interactive Controls */}
        <div style={{ display: 'grid', gridTemplateColumns: '340px 1fr', gap: '1.25rem' }}>
          
          {/* Left Column: Live Camera & Vision Feed */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Camera size={16} /> Live Feed (~3 Checks/sec)
            </span>

            <div style={{ width: '100%', height: '220px', background: '#000', borderRadius: '8px', overflow: 'hidden', position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: cameraActive ? 'block' : 'none' }}
              />
              {!cameraActive && (
                <div style={{ color: 'var(--muted)', textAlign: 'center', fontSize: '0.8rem', padding: '1rem' }}>
                  Camera inactive.<br />
                  Click <strong>Start Camera Monitor</strong> above.
                </div>
              )}

              {/* Status overlay tag */}
              {cameraActive && (
                <div style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', padding: '0.2rem 0.5rem', borderRadius: '4px', color: '#4ade80', fontSize: '0.7rem', fontWeight: 700, fontFamily: 'var(--mono)' }}>
                  REC ● 3 FPS
                </div>
              )}
            </div>

            {/* Test Simulation Controls */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>
                🧪 AI Condition Simulators
              </span>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem' }}>
                <button
                  onClick={() => setSimulatedFaceCount(simulatedFaceCount === 0 ? 1 : 0)}
                  className={`btn btn-xs ${simulatedFaceCount === 0 ? 'btn-danger' : 'btn-outline'}`}
                  style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <UserX size={12} /> {simulatedFaceCount === 0 ? 'No Face (Active)' : 'Simulate No Face'}
                </button>

                <button
                  onClick={() => setSimulatedFaceCount(simulatedFaceCount === 2 ? 1 : 2)}
                  className={`btn btn-xs ${simulatedFaceCount === 2 ? 'btn-danger' : 'btn-outline'}`}
                  style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <Users size={12} /> {simulatedFaceCount === 2 ? '>1 Face (Active)' : 'Simulate >1 Face'}
                </button>

                <button
                  onClick={() => setSimulatedTurnAway(!simulatedTurnAway)}
                  className={`btn btn-xs ${simulatedTurnAway ? 'btn-danger' : 'btn-outline'}`}
                  style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <EyeOff size={12} /> {simulatedTurnAway ? 'Turned Away' : 'Turn Away'}
                </button>

                <button
                  onClick={() => setSimulatedLuminance(simulatedLuminance < 35 ? 120 : 20)}
                  className={`btn btn-xs ${simulatedLuminance < 35 ? 'btn-danger' : 'btn-outline'}`}
                  style={{ fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <Eye size={12} /> {simulatedLuminance < 35 ? 'Low Light' : 'Dark Room'}
                </button>
              </div>

              {/* Paste Simulator inside container */}
              <div style={{ marginTop: '0.4rem', padding: '0.65rem', background: 'var(--bg2)', borderRadius: '6px', border: '1px dashed var(--indigo)' }}>
                <label style={{ fontSize: '0.72rem', color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                  📋 Paste Violation Test Area (Try pasting text below):
                </label>
                <input
                  type="text"
                  placeholder="Paste code snippet here..."
                  style={{ width: '100%', padding: '0.35rem 0.5rem', fontSize: '0.78rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
                />
              </div>
            </div>
          </div>

          {/* Right Column: Violation Stream & History Audit Log */}
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border)', paddingBottom: '0.65rem' }}>
              <span style={{ fontSize: '0.82rem', fontWeight: 800, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <ShieldAlert size={16} style={{ color: 'var(--danger)' }} /> Live Violation Event Stream
              </span>
              <span className="badge badge-indigo" style={{ fontSize: '0.65rem' }}>
                {history.length} Event{history.length === 1 ? '' : 's'} Logged
              </span>
            </div>

            {/* Active Violation Badges */}
            {activeViolations.length > 0 && (
              <div style={{ padding: '0.75rem', background: '#450a0a', border: '1px solid #7f1d1d', borderRadius: '6px', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, color: '#fca5a5', textTransform: 'uppercase' }}>
                  ⚠️ Active Conditions (Debounced Event Episode):
                </span>
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  {activeViolations.map(v => (
                    <span key={v} style={{ background: '#dc2626', color: '#fff', fontSize: '0.72rem', fontWeight: 700, padding: '0.2rem 0.6rem', borderRadius: '12px' }}>
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Log Stream */}
            <div style={{ flex: 1, minHeight: '300px', background: '#09090b', borderRadius: '6px', border: '1px solid #27272a', padding: '0.75rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {history.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#71717a', fontSize: '0.8rem', padding: '3rem 1rem' }}>
                  ✓ No violations recorded.<br />
                  Start camera or click AI condition simulators to test events.
                </div>
              ) : (
                history.map((evt, idx) => (
                  <div
                    key={evt.id || idx}
                    style={{
                      padding: '0.55rem 0.75rem', borderRadius: '4px', background: '#121215',
                      borderLeft: evt.severity === 'CRITICAL' || evt.severity === 'HIGH' ? '3px solid #ef4444' : evt.severity === 'MEDIUM' ? '3px solid #f59e0b' : '3px solid #3b82f6',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <span style={{ fontWeight: 800, color: '#f4f4f5' }}>{evt.type}</span>
                        <span style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem', borderRadius: '3px', fontWeight: 700, background: evt.severity === 'HIGH' ? '#450a0a' : '#27272a', color: evt.severity === 'HIGH' ? '#fca5a5' : '#a1a1aa' }}>
                          {evt.severity}
                        </span>
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#71717a', fontFamily: 'var(--mono)' }}>
                        Duration: {(evt.durationMs / 1000).toFixed(1)}s · {new Date(evt.timestamp).toLocaleTimeString()}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#ef4444', fontWeight: 700 }}>
                      -{evt.type === 'PASTE_ATTEMPTED' ? 30 : evt.type === 'MULTIPLE_FACES' ? 25 : evt.type === 'NO_FACE_DETECTED' ? 15 : 10} pts
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </AppShell>
  );
};

export default IntegrityTestPage;
