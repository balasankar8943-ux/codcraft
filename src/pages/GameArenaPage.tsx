// src/pages/GameArenaPage.tsx
import React, { useState, useEffect, useRef } from 'react';
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
import { Gamepad2, Play, Terminal, Code2, CheckCircle2, Smartphone, Copy, ClipboardPaste } from 'lucide-react';

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
  const [viewMode, setViewMode] = useState<'split' | 'game' | 'code'>('split');
  const [mobileNativeEditor, setMobileNativeEditor] = useState<boolean>(false);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

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

  // Mobile Clipboard helpers
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Fallback
    }
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setCode(prev => prev + '\n' + text);
    } catch {
      // Fallback
    }
  };

  return (
    <AppShell xp={xp}>
      <div style={{ maxWidth: '1440px', margin: '0 auto', padding: '0.65rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', minHeight: 'calc(100vh - 70px)' }}>
        
        {/* ── Top Header ────────────────────────────────────────── */}
        <div style={{
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(168, 85, 247, 0.08) 100%)',
          border: '1px solid #c7d2fe', borderRadius: 'var(--radius)', padding: '0.65rem 0.85rem',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'var(--indigo-bg)', color: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Gamepad2 size={20} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', flexWrap: 'wrap' }}>
                <h1 style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                  Game Arena · Starfighter Swarm
                </h1>
                <span className="badge badge-indigo" style={{ fontSize: '0.6rem' }}>Arcade Space Combat 🚀</span>
                {xpEarned && <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>+50 XP Won!</span>}
              </div>
              <p style={{ fontSize: '0.7rem', color: 'var(--muted)', margin: 0 }}>
                Pilot aircraft or code an AI algorithm to auto-vaporize alien drone swarms!
              </p>
            </div>
          </div>

          {/* Mode Switcher & Selectors */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', flexWrap: 'wrap' }}>
            
            {/* Control Mode Toggle */}
            <div style={{ display: 'flex', background: 'var(--bg2)', padding: '0.15rem', borderRadius: '6px', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setControlMode('manual')}
                style={{
                  padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, border: 'none', borderRadius: '4px', cursor: 'pointer',
                  background: controlMode === 'manual' ? '#38bdf8' : 'transparent',
                  color: controlMode === 'manual' ? '#000' : 'var(--muted)'
                }}
              >
                🕹️ Manual Flight
              </button>
              <button
                onClick={() => setControlMode('autopilot')}
                style={{
                  padding: '0.3rem 0.5rem', fontSize: '0.7rem', fontWeight: 800, border: 'none', borderRadius: '4px', cursor: 'pointer',
                  background: controlMode === 'autopilot' ? '#6366f1' : 'transparent',
                  color: controlMode === 'autopilot' ? '#fff' : 'var(--muted)'
                }}
              >
                💻 Code AI
              </button>
            </div>

            {/* Mission Scenario Dropdown */}
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
              style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer' }}
            >
              {GAME_SCENARIOS.map(sc => (
                <option key={sc.id} value={sc.id}>🚀 {sc.title}</option>
              ))}
            </select>

            {/* Language Selector */}
            <select
              value={language}
              onChange={e => handleLanguageChange(e.target.value)}
              style={{ padding: '0.3rem 0.55rem', fontSize: '0.72rem', fontWeight: 600, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer' }}
            >
              <option value="python">🐍 Python 3</option>
              <option value="cpp">⚡ C++</option>
              <option value="c">⚙️ C</option>
              <option value="java">☕ Java</option>
              <option value="javascript">🟨 JS</option>
            </select>

            {/* Launch Auto-Pilot Button */}
            <button
              onClick={handleRunSimulation}
              className="btn btn-primary btn-xs"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.35rem 0.75rem', fontWeight: 800 }}
            >
              <Play size={12} />
              <span>Compile & Run AI</span>
            </button>
          </div>
        </div>

        {/* ── View Layout Bar for Mobile & Desktops ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg2)', padding: '0.3rem 0.6rem', borderRadius: '8px', border: '1px solid var(--border)', flexWrap: 'wrap', gap: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--muted)', textTransform: 'uppercase' }}>Layout:</span>
            <button
              onClick={() => setViewMode('split')}
              className={`btn btn-xs ${viewMode === 'split' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            >
              📱 Split (Game + Code)
            </button>
            <button
              onClick={() => setViewMode('game')}
              className={`btn btn-xs ${viewMode === 'game' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            >
              🎮 Game Only
            </button>
            <button
              onClick={() => setViewMode('code')}
              className={`btn btn-xs ${viewMode === 'code' ? 'btn-primary' : 'btn-ghost'}`}
              style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem' }}
            >
              💻 Code Only
            </button>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <button
              onClick={() => setMobileNativeEditor(!mobileNativeEditor)}
              className="btn btn-ghost btn-xs"
              style={{ fontSize: '0.68rem', color: mobileNativeEditor ? 'var(--indigo)' : 'var(--muted)', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
            >
              <Smartphone size={13} />
              <span>{mobileNativeEditor ? '📱 Native Touch Keyboard: ON' : '🖥️ Monaco Keyboard'}</span>
            </button>
          </div>
        </div>

        {/* ── Main Responsive Grid / Stack Workspace ── */}
        <div className={`arena-main-layout layout-${viewMode}`}>
          
          {/* Left Column / Top Section: Combat Canvas + Mission Briefing */}
          <div className="arena-game-section" style={{ display: viewMode === 'code' ? 'none' : 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            
            {/* Playable Space Combat Canvas */}
            <GameCanvas
              frames={simulationFrames}
              codeAlgorithmActive={controlMode === 'autopilot'}
              onFinish={(success) => setIsPassed(success)}
              onScoreUpdate={(s, w) => { setSessionScore(s); setSessionWave(w); }}
            />

            {/* Mission Briefing Card */}
            <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                  🛰️ Mission: {selectedScenario.title}
                </span>
                <span className="badge badge-indigo" style={{ fontSize: '0.6rem' }}>{selectedScenario.difficulty}</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--muted2)', lineHeight: 1.4 }}>
                {selectedScenario.description}
              </p>

              {/* Combat Protocol & Live Stats */}
              <div style={{ marginTop: '0.25rem', padding: '0.45rem', background: 'var(--bg2)', borderRadius: '6px', fontSize: '0.7rem', color: 'var(--text2)', display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: '0.2rem' }}>
                  <span>🎯 <strong>Score:</strong> {sessionScore.toLocaleString()}</span>
                  <span>🌊 <strong>Wave:</strong> Wave {sessionWave}</span>
                </div>
                <div><strong>📥 Input:</strong> Proximity distance and callsign of approaching alien drones.</div>
                <div><strong>📤 Output:</strong> Print the name of closest alien threat to fire twin plasma lasers.</div>
              </div>
            </div>
          </div>

          {/* Right Column / Bottom Section: Code Editor + Output Logs */}
          <div className="arena-code-section" style={{ display: viewMode === 'game' ? 'none' : 'flex', background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', flexDirection: 'column', overflow: 'hidden' }}>
            
            {/* Editor Header Bar with Mobile Cut/Copy/Paste Shortcuts */}
            <div style={{ padding: '0.45rem 0.75rem', background: '#18181b', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#6366f1', fontSize: '0.75rem', fontWeight: 700 }}>
                <Code2 size={13} />
                <span>player_solution.{language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : language === 'java' ? 'java' : 'js'}</span>
              </div>

              {/* Mobile Editor Action Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <button onClick={handleCopy} className="btn btn-ghost btn-xs" style={{ fontSize: '0.68rem', padding: '0.2rem 0.4rem', color: '#a1a1aa' }} title="Copy Code">
                  <Copy size={11} /> Copy
                </button>
                <button onClick={handlePaste} className="btn btn-ghost btn-xs" style={{ fontSize: '0.68rem', padding: '0.2rem 0.4rem', color: '#a1a1aa' }} title="Paste Code">
                  <ClipboardPaste size={11} /> Paste
                </button>
                <button onClick={() => setCode(STARTER_CODE_TEMPLATES[language] || '')} className="btn btn-ghost btn-xs" style={{ fontSize: '0.68rem', padding: '0.2rem 0.4rem', color: '#f59e0b' }} title="Reset Code Template">
                  Reset
                </button>

                {isPassed !== null && (
                  <span style={{ fontSize: '0.68rem', color: isPassed ? '#34d399' : '#f87171', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem', marginLeft: '0.3rem' }}>
                    {isPassed ? <><CheckCircle2 size={12} /> Passed (+50 XP)</> : '❌ Failed'}
                  </span>
                )}
              </div>
            </div>

            {/* Code Input Area (Monaco on Desktop / Native Touch Option on Mobile) */}
            <div style={{ flex: 1, minHeight: '280px', background: '#1e1e1e', position: 'relative' }}>
              {!mobileNativeEditor ? (
                <Editor
                  height="100%"
                  language={language === 'c' ? 'cpp' : language}
                  theme="vs-dark"
                  value={code}
                  onChange={v => setCode(v || '')}
                  onMount={(editor, monaco) => {
                    try {
                      monaco.editor.remeasureFonts();
                      editor.layout();
                      editor.focus();
                    } catch (e) {}

                    setTimeout(() => {
                      try {
                        monaco.editor.remeasureFonts();
                        editor.layout();
                      } catch (e) {}
                    }, 100);
                  }}
                  options={{
                    fontSize: 14,
                    lineHeight: 22,
                    fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, 'Courier New', monospace",
                    fontLigatures: false,
                    letterSpacing: 0,
                    automaticLayout: true,
                    tabSize: 4,
                    insertSpaces: true,
                    detectIndentation: false,
                    autoIndent: 'full',
                    useTabStops: true,
                    trimAutoWhitespace: true,
                    formatOnType: true,
                    formatOnPaste: true,
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    cursorStyle: 'line',
                    cursorWidth: 2,
                    padding: { top: 12, bottom: 12 },
                    wordWrap: 'on',
                    bracketPairColorization: { enabled: true },
                    minimap: { enabled: false },
                    renderLineHighlight: 'all',
                    scrollBeyondLastLine: false,
                    fixedOverflowWidgets: true
                  }}
                />
              ) : (
                <textarea
                  ref={textareaRef}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  style={{
                    width: '100%', height: '100%', minHeight: '280px', padding: '0.75rem',
                    background: '#121215', color: '#f8fafc', border: 'none', outline: 'none',
                    fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: '0.85rem',
                    lineHeight: 1.5, resize: 'none'
                  }}
                />
              )}
            </div>

            {/* Simulation Combat Log Console */}
            <div style={{ borderTop: '1px solid #27272a', background: '#09090b', padding: '0.55rem', maxHeight: '140px', display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 800, color: '#a1a1aa', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Terminal size={11} /> AI Combat Telemetry Log
              </span>
              <pre style={{
                flex: 1, margin: 0, padding: '0.4rem', background: '#000000', color: '#38bdf8',
                borderRadius: '4px', border: '1px solid #1e293b', fontFamily: '"JetBrains Mono", Consolas, monospace',
                fontSize: '0.7rem', lineHeight: 1.4, whiteSpace: 'pre-wrap', overflowY: 'auto'
              }}>
                {simulationLogs || 'Click "Compile & Run AI" above to test your algorithm against alien swarms!'}
              </pre>
            </div>
          </div>
        </div>

        {/* Responsive CSS Styles */}
        <style>{`
          .arena-main-layout {
            display: grid;
            grid-template-columns: minmax(380px, 1.15fr) 1fr;
            gap: 0.85rem;
            flex: 1;
            min-height: 600px;
          }
          .layout-game {
            grid-template-columns: 1fr !important;
          }
          .layout-code {
            grid-template-columns: 1fr !important;
          }
          @media (max-width: 960px) {
            .arena-main-layout {
              display: flex !important;
              flex-direction: column !important;
              min-height: auto !important;
            }
            .arena-game-section {
              width: 100% !important;
            }
            .arena-code-section {
              width: 100% !important;
              min-height: 380px !important;
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
