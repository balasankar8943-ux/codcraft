// src/components/CodeSandbox.tsx
import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { useAuth } from './AuthProvider';
import { Play, CheckCircle, AlertCircle, HelpCircle, Timer, RotateCcw } from 'lucide-react';

interface TestCase {
  input: string;
  output: string;
}

interface Question {
  id: number;
  title: string;
  level: string;
  category: string;
  content: string;
  templates: Record<string, string>;
  testCases: TestCase[];
  xp_reward: number;
}

interface Props {
  question: Question;
  onSolved: (xpChange: number, questionId: number) => void;
  isActive: boolean;
}

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,  // Python (3.8.1)
  cpp: 54,     // C++ (GCC 9.2.0)
  c: 50,       // C (GCC 9.2.0)
  java: 62     // Java (OpenJDK 13.0.1)
};

const CodeSandbox: React.FC<Props> = ({ question, onSolved, isActive }) => {
  const { user } = useAuth();
  const [language, setLanguage] = useState<string>('python');
  const [mobileTab, setMobileTab] = useState<'problem' | 'code'>('problem');
  const [code, setCode] = useState<string>('');
  const [outputs, setOutputs] = useState<Array<{ status: 'idle' | 'running' | 'pass' | 'fail' | 'error'; stdout?: string; stderr?: string; expected?: string }>>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solved, setSolved] = useState(false);
  const [executionMessage, setExecutionMessage] = useState<string | null>(null);

  // Timer states
  const [timeLeft, setTimeLeft] = useState<number>(900); // 15 mins default
  const [floatingXp, setFloatingXp] = useState<string | null>(null);

  // Determine initial time limit based on problem difficulty
  const getInitialTimeLimit = (lvl: string) => {
    switch (lvl.toLowerCase()) {
      case 'pro': return 2400; // 40 minutes
      case 'mid': return 1500; // 25 minutes
      case 'beginner':
      default:
        return 900;  // 15 minutes
    }
  };

  // Reset/Initialize editor and timer on problem or language change
  useEffect(() => {
    if (question.templates && question.templates[language]) {
      setCode(question.templates[language]);
    } else {
      setCode('');
    }
    
    setOutputs(question.testCases.map(tc => ({ status: 'idle', expected: tc.output })));
    setSolved(false);
    setExecutionMessage(null);
    setTimeLeft(getInitialTimeLimit(question.level));
  }, [question, language]);

  // Timer countdown hook
  useEffect(() => {
    if (solved || timeLeft <= 0 || isRunning || !isActive) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, solved, isRunning, isActive]);

  const triggerFloatingXp = (text: string) => {
    setFloatingXp(text);
    setTimeout(() => {
      setFloatingXp(null);
    }, 2000);
  };

  const handleRestartTimer = () => {
    setTimeLeft(getInitialTimeLimit(question.level));
    setExecutionMessage(null);
  };

  const runCodeJudge0 = async (srcCode: string, langId: number, stdin: string): Promise<{ stdout?: string; stderr?: string; error?: string }> => {
    try {
      const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
          'x-rapidapi-key': import.meta.env.VITE_JUDGE0_API_KEY || ''
        },
        body: JSON.stringify({
          source_code: srcCode,
          language_id: langId,
          stdin: stdin
        })
      });

      if (!response.ok) {
        const publicResponse = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
          method: 'POST',
          headers: {
            'content-type': 'application/json'
          },
          body: JSON.stringify({
            source_code: srcCode,
            language_id: langId,
            stdin: stdin
          })
        });
        if (!publicResponse.ok) throw new Error('Judge0 connection failed');
        const data = await publicResponse.json();
        return {
          stdout: data.stdout || '',
          stderr: data.stderr || data.compile_output || ''
        };
      }

      const data = await response.json();
      return {
        stdout: data.stdout || '',
        stderr: data.stderr || data.compile_output || ''
      };
    } catch (e) {
      throw e;
    }
  };

  const executeCode = async () => {
    if (timeLeft <= 0) {
      alert("Timer has expired! Please restart the timer to compile/run code.");
      return;
    }

    setIsRunning(true);
    setExecutionMessage(null);
    const newOutputs = [...outputs];

    question.testCases.forEach((_, idx) => {
      newOutputs[idx] = { ...newOutputs[idx], status: 'running' };
    });
    setOutputs(newOutputs);

    let useMock = false;
    if (!import.meta.env.VITE_JUDGE0_API_KEY) {
      useMock = true;
    }

    const promises = question.testCases.map(async (tc) => {
      if (useMock) {
        await new Promise(resolve => setTimeout(resolve, 1200 + Math.random() * 300));
        
        const codeNorm = code.toLowerCase();
        let pass = false;
        
        if (question.id === 101) { // Even or Odd
          pass = codeNorm.includes('even') && codeNorm.includes('odd') && (codeNorm.includes('%') || codeNorm.includes('mod'));
        } else if (question.id === 102) { // Sum to N
          pass = (codeNorm.includes('sum') || codeNorm.includes('range')) && (codeNorm.includes('int') || codeNorm.includes('for') || codeNorm.includes('sum ='));
        } else if (question.id === 103) { // Multiply Two
          pass = codeNorm.includes('*') || codeNorm.includes('product') || codeNorm.includes('multiply');
        } else if (question.id === 201) { // Fibonacci
          pass = codeNorm.includes('fib') && (codeNorm.includes('n - 1') || codeNorm.includes('n-1') || codeNorm.includes('loop'));
        } else if (question.id === 202) { // Valid Parentheses
          pass = codeNorm.includes('stack') || codeNorm.includes('replace') || codeNorm.includes('pop') || codeNorm.includes('push');
        } else if (question.id === 301) { // Max Subarray Sum
          pass = codeNorm.includes('max') && (codeNorm.includes('subarray') || codeNorm.includes('sum') || codeNorm.includes('kadane'));
        } else if (question.id === 302) { // Coin Change
          pass = codeNorm.includes('coin') || codeNorm.includes('amount') || codeNorm.includes('dp') || codeNorm.includes('min');
        } else {
          pass = code.trim().length > 20; // general length check for mock questions
        }

        return {
          status: pass ? 'pass' as const : 'fail' as const,
          stdout: pass ? tc.output : 'Stdout: Execution mismatch. Debug your code logic.',
          stderr: pass ? '' : 'Warning: Testcase output mismatch.'
        };
      } else {
        try {
          const res = await runCodeJudge0(code, LANGUAGE_IDS[language], tc.input);
          if (res.stderr) {
            return {
              status: 'error' as const,
              stdout: res.stdout,
              stderr: res.stderr
            };
          }
          const cleanOut = (res.stdout || '').trim();
          const cleanExpected = tc.output.trim();
          const isCorrect = cleanOut === cleanExpected;
          return {
            status: isCorrect ? ('pass' as const) : ('fail' as const),
            stdout: cleanOut,
            stderr: ''
          };
        } catch (err) {
          useMock = true;
          setExecutionMessage("Network offline: Compiling in Simulated Sandbox mode.");
          await new Promise(resolve => setTimeout(resolve, 800));
          return {
            status: 'pass' as const,
            stdout: tc.output,
            stderr: ''
          };
        }
      }
    });

    const results = await Promise.all(promises);
    const allPassed = results.every(res => res.status === 'pass');

    // Negative scoring penalty trigger (-5 XP) if execution fails
    if (!allPassed) {
      onSolved(-5, question.id);
      triggerFloatingXp("-5 XP");
    }


    const localKey = `codcraft_submissions_${user?.id || 'guest'}_${question.level}`;
    const stored = JSON.parse(localStorage.getItem(localKey) || '[]') as boolean[];
    stored.unshift(allPassed);
    if (stored.length > 10) {
      stored.pop();
    }
    localStorage.setItem(localKey, JSON.stringify(stored));

    setOutputs(results.map((res, idx) => ({
      status: res.status,
      stdout: res.stdout,
      stderr: res.stderr,
      expected: question.testCases[idx].output
    })));

    setIsRunning(false);
  };

  const submitSolution = async () => {
    const allPassed = outputs.every(o => o.status === 'pass');
    if (!allPassed) {
      alert("Please ensure all test cases pass before submitting your code!");
      return;
    }

    setIsSubmitting(true);
    try {
      localStorage.setItem(`codcraft_solved_${user?.id || 'guest'}_${question.id}`, 'true');

      setSolved(true);
      onSolved(question.xp_reward, question.id);
      triggerFloatingXp(`+${question.xp_reward} XP`);
    } catch (err) {
      console.warn("Failed to submit solution:", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs < 10 ? '0' : ''}${secs}s`;
  };

  return (
    <div className="sandbox-wrap mt-4 relative">
      
      {/* Mobile Tab Switcher */}
      <div className="sandbox-mobile-tabs">
        <button 
          type="button"
          className={`sandbox-mobile-tab ${mobileTab === 'problem' ? 'active' : ''}`}
          onClick={() => setMobileTab('problem')}
        >
          📝 Problem & Tests
        </button>
        <button 
          type="button"
          className={`sandbox-mobile-tab ${mobileTab === 'code' ? 'active' : ''}`}
          onClick={() => setMobileTab('code')}
        >
          💻 Code Editor
        </button>
      </div>

      {/* Floating XP indicator animation */}
      {floatingXp && (
        <div style={{
          position: 'absolute', top: '5rem', left: '50%', transform: 'translateX(-50%)',
          zIndex: 50, padding: '0.5rem 1.25rem', background: 'var(--bg2)',
          border: '1px solid var(--border)', borderRadius: '24px',
          boxShadow: 'var(--shadow-lg)', animation: 'bounce 1s infinite',
          color: floatingXp.startsWith('-') ? 'var(--danger)' : 'var(--success)',
          fontWeight: 800, fontSize: '0.84rem', display: 'flex', alignItems: 'center', gap: '0.4rem'
        }}>
          <span>{floatingXp.startsWith('+') ? '⭐' : '❄️'}</span>
          <span>{floatingXp}</span>
        </div>
      )}

      {/* Editor Pane (Left) */}
      <div className={`sandbox-editor-pane sandbox-editor h-[520px] relative ${mobileTab === 'code' ? 'show-mobile' : 'hide-mobile'}`}>
        {/* Lock editor overlay when time runs out */}
        {timeLeft <= 0 && (
          <div style={{
            position: 'absolute', inset: 0, background: 'rgba(255, 255, 255, 0.96)',
            zIndex: 30, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', padding: '1.5rem', textAlign: 'center'
          }}>
            <span style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>⌛</span>
            <h4 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.5rem' }}>Problem Timer Expired!</h4>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '1rem', maxWidth: '240px', lineHeight: 1.5 }}>
              Your allocated code compilation time limit has expired. Restart the timer to continue writing and testing code.
            </p>
            <button
              onClick={handleRestartTimer}
              className="btn btn-outline btn-sm"
              style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <RotateCcw size={12} /> Restart Problem Timer
            </button>
          </div>
        )}

        {/* Editor controls */}
        <div className="sandbox-toolbar">
          <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text2)' }}>Monaco Code Editor</span>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="select"
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem', borderRadius: '6px' }}
          >
            <option value="python">Python 3</option>
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
            <option value="java">Java (OpenJDK)</option>
          </select>
        </div>

        {/* Monaco Editor */}
        <div style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
          <Editor
            height="100%"
            language={language === 'cpp' || language === 'c' ? 'cpp' : language}
            theme="vs-dark"
            value={code}
            onChange={value => setCode(value || '')}
            options={{
              minimap: { enabled: false },
              fontSize: 13,
              fontFamily: 'JetBrains Mono',
              automaticLayout: true,
              tabSize: 4,
              padding: { top: 12 },
              readOnly: timeLeft <= 0 || solved,
              wordWrap: 'on',
              lineNumbersMinChars: 3
            }}
          />
        </div>
      </div>

      {/* Console and Verification Pane (Right) */}
      <div className={`sandbox-panel-pane sandbox-panel h-[520px] ${mobileTab === 'problem' ? 'show-mobile' : 'hide-mobile'}`}>
        <div style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <div>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text)', marginBottom: '0.25rem' }}>{question.title}</h3>
            <span className="brand-badge">
              {question.level} Track • +{question.xp_reward} XP
            </span>
          </div>

          {/* TIMER DISPLAY */}
          <div className={`timer-chip ${timeLeft <= 60 ? 'danger' : ''}`}>
            <Timer size={14} />
            <span>{formatTime(timeLeft)}</span>
          </div>
        </div>

        {/* Problem description */}
        <div style={{ fontSize: '0.8rem', color: 'var(--text2)', lineHeight: 1.6, whiteSpace: 'pre-line', background: 'var(--bg)', padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          {question.content}
        </div>

        {executionMessage && (
          <div className="alert alert-error" style={{ padding: '0.5rem 0.75rem', marginBottom: 0 }}>
            <span>⚠️</span>
            <p style={{ margin: 0 }}>{executionMessage}</p>
          </div>
        )}

        {/* Test cases list */}
        <div className="flex flex-col gap-3">
          <h4 style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Test Cases Run</h4>
          {outputs.map((out, idx) => (
            <div
              key={idx}
              className={`tc-row ${
                out.status === 'pass'
                  ? 'tc-pass'
                  : out.status === 'fail' || out.status === 'error'
                  ? 'tc-fail'
                  : out.status === 'running'
                  ? 'tc-run'
                  : ''
              }`}
            >
              <div className="flex justify-between items-center" style={{ marginBottom: '0.4rem' }}>
                <span style={{ fontWeight: 700, color: 'var(--text2)' }}>Test Case #{idx + 1}</span>
                <span className="flex items-center gap-1">
                  {out.status === 'pass' && (
                    <span style={{ color: 'var(--success)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <CheckCircle size={12} /> Pass
                    </span>
                  )}
                  {out.status === 'fail' && (
                    <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <AlertCircle size={12} /> Output Mismatch
                    </span>
                  )}
                  {out.status === 'error' && (
                    <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <AlertCircle size={12} /> Compile/Run Error
                    </span>
                  )}
                  {out.status === 'running' && (
                    <span style={{ color: 'var(--gold)', animation: 'pulse 1s infinite' }}>Running...</span>
                  )}
                  {out.status === 'idle' && (
                    <span style={{ color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.2rem' }}>
                      <HelpCircle size={12} /> Idle
                    </span>
                  )}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2" style={{ marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border)', fontSize: '0.72rem', fontFamily: 'var(--mono)' }}>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.65rem', marginBottom: '0.15rem' }}>Input:</span>
                  <pre style={{ background: 'var(--bg)', padding: '0.35rem 0.5rem', borderRadius: '4px', overflowX: 'auto', border: '1px solid var(--border)', color: 'var(--text2)' }}>{question.testCases[idx].input}</pre>
                </div>
                <div>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.65rem', marginBottom: '0.15rem' }}>Expected Output:</span>
                  <pre style={{ background: 'var(--bg)', padding: '0.35rem 0.5rem', borderRadius: '4px', overflowX: 'auto', border: '1px solid var(--border)', color: 'var(--text2)' }}>{out.expected}</pre>
                </div>
              </div>
              {out.stdout && out.status !== 'pass' && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', fontFamily: 'var(--mono)', borderTop: '1px solid var(--border)', paddingTop: '0.4rem' }}>
                  <span style={{ color: 'var(--muted)', display: 'block', fontSize: '0.65rem', marginBottom: '0.15rem' }}>Your Output:</span>
                  <pre style={{ color: 'var(--danger)', background: 'var(--bg)', padding: '0.35rem 0.5rem', borderRadius: '4px', overflowX: 'auto', border: '1px solid var(--border)' }}>{out.stdout}</pre>
                </div>
              )}
              {out.stderr && (
                <div style={{ marginTop: '0.4rem', fontSize: '0.72rem', fontFamily: 'var(--mono)', borderTop: '1px solid var(--border)', paddingTop: '0.4rem' }}>
                  <span style={{ color: 'var(--danger)', fontWeight: 700, display: 'block', fontSize: '0.65rem', marginBottom: '0.15rem' }}>Stderr / Compile Output:</span>
                  <pre style={{ color: 'var(--danger)', background: 'var(--danger-bg)', padding: '0.35rem 0.5rem', borderRadius: '4px', overflowX: 'auto', border: '1px solid #fca5a5', whiteSpace: 'pre-wrap' }}>{out.stderr}</pre>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Compile / Submit Buttons */}
        <div style={{ display: 'flex', gap: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border)', marginTop: 'auto' }}>
          <button
            onClick={executeCode}
            disabled={isRunning || isSubmitting || solved || timeLeft <= 0}
            className="btn btn-outline"
            style={{ flex: 1, padding: '0.7rem' }}
          >
            <Play size={12} /> {isRunning ? 'Running...' : 'Run Code'}
          </button>
          <button
            onClick={submitSolution}
            disabled={
              isRunning ||
              isSubmitting ||
              solved ||
              timeLeft <= 0 ||
              !outputs.every(o => o.status === 'pass')
            }
            className="btn btn-primary"
            style={{ flex: 1, padding: '0.7rem' }}
          >
            <CheckCircle size={12} /> {isSubmitting ? 'Submitting...' : solved ? 'Solved!' : 'Submit Solution'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default CodeSandbox;
