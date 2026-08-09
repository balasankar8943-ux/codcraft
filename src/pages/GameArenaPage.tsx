// src/pages/GameArenaPage.tsx
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import AppShell from '../components/AppShell';
import { GameCanvas } from '../components/GameCanvas';
import AIHintAssistant from '../components/AIHintAssistant';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';
import {
  GAME_SCENARIOS,
  STARTER_CODE_TEMPLATES,
  simulateGameScenario
} from '../services/gameEngine';
import type {
  GameTurnFrame,
  GameScenario
} from '../services/gameEngine';
import { Gamepad2, Play, Terminal, Code2, CheckCircle2 } from 'lucide-react';

const GameArenaPage: React.FC = () => {
  const { user } = useAuth();
  const [xp, setXp] = useState<number>(0);
  const [selectedScenario, setSelectedScenario] = useState<GameScenario>(GAME_SCENARIOS[0]);
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>(STARTER_CODE_TEMPLATES.python);
  
  const [simulationFrames, setSimulationFrames] = useState<GameTurnFrame[]>([]);
  const [simulationLogs, setSimulationLogs] = useState<string>('');
  const [isPassed, setIsPassed] = useState<boolean | null>(null);
  const [xpEarned, setXpEarned] = useState<boolean>(false);

  const [controlMode, setControlMode] = useState<'manual' | 'autopilot'>('manual');
  const [sessionScore, setSessionScore] = useState<number>(0);
  const [sessionWave, setSessionWave] = useState<number>(1);
  const [mobileTab, setMobileTab] = useState<'game' | 'code' | 'briefing'>('game');

  // Load user XP
  useEffect(() => {
    if (!user) return;
    supabase
      .from('student_progress')
      .select('score')
      .eq('email', user.email)
      .single()
      .then(({ data }) => {
        if (data?.score) setXp(data.score);
      }, () => {});
  }, [user]);

  // Update starter code when language changes
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(STARTER_CODE_TEMPLATES[newLang] || STARTER_CODE_TEMPLATES.python);
  };

  // Run visual game simulation
  const handleRunSimulation = () => {
    setControlMode('autopilot');
    const result = simulateGameScenario(selectedScenario, code, language);
    setSimulationFrames(result.frames);
    setSimulationLogs(result.log);
    setIsPassed(result.success);

    // Reward XP on first victory
    if (result.success && !xpEarned && user) {
      setXpEarned(true);
      const newScore = xp + 50;
      setXp(newScore);
      supabase
        .from('student_progress')
        .update({ score: newScore })
        .eq('email', user.email)
        .then(() => {});
    }
  };

  return (
    <AppShell xp={xp}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', minHeight: 'calc(100vh - 70px)' }}>
        
        {/* ── Top Header ────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid #c7d2fe', borderRadius: 'var(--radius)', padding: '0.75rem 1rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--indigo-bg)', color: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gamepad2 size={22} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                  Game Arena · Starfighter Swarm
                </h1>
                <span className="badge badge-indigo" style={{ fontSize: '0.62rem' }}>Arcade Space Combat 🚀</span>
                {xpEarned && <span className="badge badge-green" style={{ fontSize: '0.62rem' }}>+50 XP Won!</span>}
              </div>
              <p style={{ fontSize: '0.72rem', color: 'var(--muted)', margin: 0 }}>
                Pilot with touch/keys or code an AI algorithm to auto-vaporize alien drone swarms!
              </p>
            </div>
          </div>

          {/* Mode Switcher & Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            
            {/* Control Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg2)', padding: '0.2rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setControlMode('manual')}
                style={{
                  padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: 800, border: 'none', borderRadius: '4px', cursor: 'pointer',
                  background: controlMode === 'manual' ? '#38bdf8' : 'transparent',
                  color: controlMode === 'manual' ? '#000' : 'var(--muted)'
                }}
              >
                🕹️ Manual Flight
              </button>
              <button
                onClick={() => setControlMode('autopilot')}
                style={{
                  padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: 800, border: 'none', borderRadius: '4px', cursor: 'pointer',
                  background: controlMode === 'autopilot' ? '#6366f1' : 'transparent',
                  color: controlMode === 'autopilot' ? '#fff' : 'var(--muted)'
                }}
              >
                💻 Code AI
              </button>
            </div>

            <select
              value={selectedScenario.id}
              onChange={e => {
                const found = GAME_SCENARIOS.find(s => s.id === e.target.value);
                if (found) {
                  setSelectedScenario(found);
                  setSimulationFrames([]);
                  setIsPassed(null);
                }
              }}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer' }}
            >
              {GAME_SCENARIOS.map(sc => (
                <option key={sc.id} value={sc.id}>🚀 {sc.title}</option>
              ))}
            </select>

            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
              style={{ padding: '0.35rem 0.6rem', fontSize: '0.75rem', fontWeight: 600, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer' }}
            >
              <option value="python">🐍 Python 3</option>
              <option value="cpp">⚡ C++</option>
              <option value="c">⚙️ C</option>
              <option value="java">☕ Java</option>
              <option value="javascript">🟨 JS</option>
            </select>

            <button
              onClick={handleRunSimulation}
              className="btn btn-primary btn-xs"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.4rem 0.75rem', fontWeight: 800 }}
            >
              <Play size={13} />
              <span>Compile & Auto-Pilot</span>
            </button>
          </div>
        </div>

        {/* ── Mobile/Tablet Tab Switcher (Visible on small screens) ── */}
        <div className="mobile-arena-tabs" style={{ display: 'flex', gap: '0.4rem', background: 'var(--bg2)', padding: '0.3rem', borderRadius: '8px', border: '1px solid var(--border)' }}>
          <button
            onClick={() => setMobileTab('game')}
            style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: 'none', borderRadius: '6px', cursor: 'pointer', background: mobileTab === 'game' ? 'var(--indigo)' : 'transparent', color: mobileTab === 'game' ? '#fff' : 'var(--muted)' }}
          >
            🎮 Space Combat
          </button>
          <button
            onClick={() => setMobileTab('code')}
            style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: 'none', borderRadius: '6px', cursor: 'pointer', background: mobileTab === 'code' ? 'var(--indigo)' : 'transparent', color: mobileTab === 'code' ? '#fff' : 'var(--muted)' }}
          >
            💻 Code Solution
          </button>
          <button
            onClick={() => setMobileTab('briefing')}
            style={{ flex: 1, padding: '0.45rem', fontSize: '0.75rem', fontWeight: 800, border: 'none', borderRadius: '6px', cursor: 'pointer', background: mobileTab === 'briefing' ? 'var(--indigo)' : 'transparent', color: mobileTab === 'briefing' ? '#fff' : 'var(--muted)' }}
          >
            📋 Mission Rules
          </button>
        </div>

        {/* ── Responsive Workspace Grid ── */}
        <div className="arena-workspace-grid">
          
          {/* Left Column: Interactive Combat Canvas + Mission Briefing */}
          <div className={`arena-left-pane ${mobileTab === 'game' || mobileTab === 'briefing' ? 'pane-active' : 'pane-hidden-mobile'}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
            
            {/* Space Combat Canvas */}
            <div style={{ display: mobileTab === 'game' || window.innerWidth > 960 ? 'block' : 'none' }}>
              <GameCanvas
                frames={simulationFrames}
                codeAlgorithmActive={controlMode === 'autopilot'}
                onFinish={(success) => setIsPassed(success)}
                onScoreUpdate={(s, w) => { setSessionScore(s); setSessionWave(w); }}
              />
            </div>

            {/* Mission Briefing Card */}
            <div style={{ display: mobileTab === 'briefing' || window.innerWidth > 960 ? 'flex' : 'none', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.85rem', flexDirection: 'column', gap: '0.45rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  🛰️ Starfighter Mission Briefing
                </span>
                <span className="badge badge-indigo" style={{ fontSize: '0.62rem' }}>{selectedScenario.difficulty}</span>
              </div>
              <h3 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>
                {selectedScenario.title} · <span style={{ fontSize: '0.75rem', color: 'var(--indigo)', fontWeight: 600 }}>{selectedScenario.subtitle}</span>
              </h3>
              <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--muted2)', lineHeight: 1.4 }}>
                {selectedScenario.description}
              </p>

              {/* Combat Protocol & Live Stats */}
              <div style={{ marginTop: '0.35rem', padding: '0.55rem', background: 'var(--bg2)', borderRadius: '6px', fontSize: '0.72rem', color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.25rem' }}>
                  <span>🎯 <strong>Session Score:</strong> {sessionScore.toLocaleString()}</span>
                  <span>🌊 <strong>Wave Reached:</strong> Wave {sessionWave}</span>
                </div>
                <div><strong>📥 Telemetry (Input):</strong> Proximity distance and callsign of approaching alien drones.</div>
                <div><strong>📤 Weapons Fire (Output):</strong> Print the name of closest alien threat to fire twin plasma cannons.</div>
              </div>
            </div>
          </div>

          {/* Right Column: Monaco Code Editor + Output Logs */}
          <div className={`arena-right-pane ${mobileTab === 'code' ? 'pane-active' : 'pane-hidden-mobile'}`} style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Editor Header Bar */}
            <div style={{ padding: '0.55rem 0.85rem', background: '#18181b', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#6366f1', fontSize: '0.78rem', fontWeight: 700 }}>
                <Code2 size={14} />
                <span>player_solution.{language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'java' ? 'java' : 'js'}</span>
              </div>

              {isPassed !== null && (
                <div>
                  {isPassed ? (
                    <span style={{ fontSize: '0.7rem', color: '#34d399', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle2 size={13} /> Test Passed (+50 XP)
                    </span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: '#f87171', fontWeight: 700 }}>
                      ❌ Test Failed
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Monaco Editor Container */}
            <div style={{ flex: 1, minHeight: '320px', background: '#1e1e1e' }}>
              <Editor
                height="100%"
                language={language === 'c' ? 'cpp' : language}
                theme="vs-dark"
                value={code}
                onChange={v => setCode(v || '')}
                options={{
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", Consolas, monospace',
                  automaticLayout: true,
                  tabSize: 4,
                  padding: { top: 12, bottom: 12 },
                  wordWrap: 'on',
                  bracketPairColorization: { enabled: true }
                }}
              />
            </div>

            {/* Simulation Turn Logs Console */}
            <div style={{ borderTop: '1px solid #27272a', background: '#09090b', padding: '0.65rem', maxHeight: '160px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Terminal size={12} /> Simulation Combat Log
              </span>
              <pre style={{
                flex: 1, margin: 0, padding: '0.45rem', background: '#000000', color: '#38bdf8',
                borderRadius: '4px', border: '1px solid #1e293b', fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: '0.72rem', lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowY: 'auto'
              }}>
                {simulationLogs || 'Click "Compile & Auto-Pilot" above to test your algorithm against alien swarms!'}
              </pre>
            </div>
          </div>
        </div>

        {/* CSS for Media Queries */}
        <style>{`
          .arena-workspace-grid {
            display: grid;
            grid-template-columns: minmax(380px, 1.15fr) 1fr;
            gap: 1rem;
            flex: 1;
            min-height: 600px;
          }
          .mobile-arena-tabs {
            display: none !important;
          }
          @media (max-width: 960px) {
            .arena-workspace-grid {
              display: flex !important;
              flex-direction: column !important;
            }
            .mobile-arena-tabs {
              display: flex !important;
            }
            .pane-hidden-mobile {
              display: none !important;
            }
            .pane-active {
              display: flex !important;
            }
          }
        `}</style>

        {/* Floating AI Assistant */}
        <AIHintAssistant
          questionTitle="Starfighter Swarm Intercept (Gamified IDE)"
          questionContent={selectedScenario.description}
          questionLevel={selectedScenario.difficulty}
          language={language}
          code={code}
          testCases={[]}
        />
      </div>
    </AppShell>
  );
};

export default GameArenaPage;
