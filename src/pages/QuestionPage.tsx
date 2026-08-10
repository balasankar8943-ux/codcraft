// src/pages/QuestionPage.tsx
// Full-screen question + code editor page (/question/:id)
import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../components/AuthProvider';
import { supabase } from '../supabaseClient';
import Editor from '@monaco-editor/react';
import questionsData from '../data/questions.json';
import AIHintAssistant from '../components/AIHintAssistant';

// ── Lucide icons inline (avoid import issues) ───────────────
const ArrowLeft = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
);
const PlayIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3"/></svg>
);
const CheckIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="20 6 9 17 4 12"/></svg>
);
const TimerIcon = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
);
const RotateIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>
);
const CollapseLeft = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="15 18 9 12 15 6"/></svg>
);
const CollapseRight = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><polyline points="9 18 15 12 9 6"/></svg>
);

// ── Types ────────────────────────────────────────────────────
type TestCase = { input: string; output: string };
type Question = {
  id: number; title: string; level: string; category: string;
  content: string; templates: Record<string, string>;
  testCases: TestCase[]; xp_reward: number;
};
type OutputState = {
  status: 'idle' | 'running' | 'pass' | 'fail' | 'error';
  stdout?: string; stderr?: string; expected?: string;
};

const LANGUAGE_IDS: Record<string, number> = { python: 71, cpp: 54, c: 50, java: 62 };
const getTimeLimit = (lvl: string) => lvl === 'pro' ? 2400 : lvl === 'mid' ? 1500 : 900;
const fmtTime = (s: number) => `${Math.floor(s / 60)}m ${(s % 60).toString().padStart(2, '0')}s`;

// ── Mock execution (when no Judge0 key) ──────────────────────
const mockRun = async (questionId: number, code: string, tc: TestCase): Promise<{ status: 'pass' | 'fail'; stdout: string; stderr: string }> => {
  await new Promise(r => setTimeout(r, 900 + Math.random() * 400));
  const c = code.toLowerCase();
  let pass = false;
  if (questionId === 101) pass = (c.includes('even') && c.includes('odd') && (c.includes('%') || c.includes('mod')));
  else if (questionId === 102) pass = (c.includes('sum') || c.includes('range')) && (c.includes('int') || c.includes('for'));
  else if (questionId === 103) pass = c.includes('*') || c.includes('product');
  else if (questionId === 201) pass = c.includes('fib') && (c.includes('n-1') || c.includes('n - 1') || c.includes('loop'));
  else if (questionId === 202) pass = c.includes('stack') || c.includes('pop') || c.includes('push');
  else if (questionId === 301) pass = c.includes('max') && (c.includes('sum') || c.includes('kadane'));
  else if (questionId === 302) pass = c.includes('dp') || c.includes('coin') || c.includes('min');
  else pass = code.trim().length > 20;
  return { status: pass ? 'pass' : 'fail', stdout: pass ? tc.output : 'Output mismatch', stderr: '' };
};

// ── Real Judge0 execution ───────────────────────────────────
const judge0Run = async (code: string, langId: number, input: string): Promise<{ stdout: string; stderr: string }> => {
  const body = JSON.stringify({ source_code: code, language_id: langId, stdin: input });
  const headers = { 'content-type': 'application/json' };
  const apiKey = (import.meta as any).env?.VITE_JUDGE0_API_KEY || '';

  // Try RapidAPI first
  if (apiKey) {
    const r = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { ...headers, 'x-rapidapi-key': apiKey, 'x-rapidapi-host': 'judge0-ce.p.rapidapi.com' },
      body,
    });
    if (r.ok) {
      const d = await r.json();
      return { stdout: d.stdout || '', stderr: d.stderr || d.compile_output || '' };
    }
  }

  // Public fallback
  const r2 = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST', headers, body,
  });
  if (!r2.ok) throw new Error('Judge0 unavailable');
  const d2 = await r2.json();
  return { stdout: d2.stdout || '', stderr: d2.stderr || d2.compile_output || '' };
};

// ════════════════════════════════════════════════════════════
const QuestionPage: React.FC = () => {
  const { id }             = useParams<{ id: string }>();
  const [searchParams]     = useSearchParams();
  const isDaily            = searchParams.get('daily') === 'true';
  const navigate           = useNavigate();
  const { user }           = useAuth();

  const allQuestions: Question[] = (questionsData as any).coding;
  const question = allQuestions.find(q => q.id === Number(id));

  const [language,     setLanguage]     = useState('python');
  const [code,         setCode]         = useState('');
  const [outputs,      setOutputs]      = useState<OutputState[]>([]);
  const [isRunning,    setIsRunning]    = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [solved,       setSolved]       = useState(false);
  const [execMsg,      setExecMsg]      = useState<string | null>(null);
  const [timeLeft,     setTimeLeft]     = useState(900);
  const [floatXp,      setFloatXp]      = useState<string | null>(null);
  const [mobileTab,    setMobileTab]    = useState<'problem' | 'editor'>('problem');
  const [panelOpen,    setPanelOpen]    = useState(true);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const editorRef = useRef<any>(null);

  // ── Load question & restore saved code ───────────────────
  useEffect(() => {
    if (!question) return;
    setSolved(false);
    setExecMsg(null);
    setOutputs(question.testCases.map(tc => ({ status: 'idle', expected: tc.output })));
    const limit = getTimeLimit(question.level);
    setTimeLeft(limit);

    const loadSavedCode = async () => {
      let dbCode: string | null = null;
      if (user) {
        try {
          const { data } = await supabase.from('student_progress').select('solved_questions').eq('email', user.email).single();
          const solvedList = data?.solved_questions || [];
          const match = solvedList.find((item: any) => item && typeof item === 'object' && item.id === question.id && item.lang === language);
          if (match && typeof match === 'object') {
            dbCode = match.code;
          }
        } catch (err) {
          console.warn("Could not load code from Supabase:", err);
        }
      }

      const userIdKey = user?.id || 'guest';
      const savedKey = `codcraft_code_${userIdKey}_${question.id}_${language}`;
      const saved = localStorage.getItem(savedKey);
      setCode(dbCode ?? saved ?? (question.templates?.[language] || ''));
    };
    loadSavedCode();

    if (user) {
      if (localStorage.getItem(`codcraft_solved_${user.id}_${question.id}`) === 'true') {
        setSolved(true);
      } else {
        const checkSolvedStatus = async () => {
          try {
            const { data } = await supabase.from('student_progress').select('solved_questions').eq('email', user.email).single();
            const solvedList = data?.solved_questions || [];
            const isSolvedDb = solvedList.some((item: any) => {
              if (typeof item === 'number') return item === question.id;
              if (item && typeof item === 'object') return item.id === question.id;
              return false;
            });
            if (isSolvedDb) {
              setSolved(true);
              localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');
            }
          } catch {}
        };
        checkSolvedStatus();
      }
    }
  }, [question?.id, language, user?.id]);

  // ── Persist code (debounced 800ms) ───────────────────────
  useEffect(() => {
    if (!question || !code) return;
    const userIdKey = user?.id || 'guest';
    const key = `codcraft_code_${userIdKey}_${question.id}_${language}`;
    const t = setTimeout(() => localStorage.setItem(key, code), 800);
    return () => clearTimeout(t);
  }, [code, question?.id, language, user?.id]);

  // ── Timer ─────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (solved || timeLeft <= 0) return;
    timerRef.current = setInterval(() => {
      setTimeLeft(p => {
        if (p <= 1) { clearInterval(timerRef.current!); return 0; }
        return p - 1;
      });
    }, 1000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [solved, question?.id]);

  // ── Not found ────────────────────────────────────────────
  if (!question) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', flexDirection: 'column', gap: '1rem' }}>
        <p style={{ fontSize: '1.1rem', color: 'var(--text)' }}>Question #{id} not found.</p>
        <button className="btn btn-outline" onClick={() => navigate('/')}>← Back to Practice</button>
      </div>
    );
  }

  // ── Run Code ─────────────────────────────────────────────
  const runCode = async () => {
    if (timeLeft <= 0) { setExecMsg('Timer expired! Restart the timer first.'); return; }
    setIsRunning(true);
    setExecMsg(null);
    setOutputs(question.testCases.map(tc => ({ status: 'running', expected: tc.output })));

    const useJudge = !!(import.meta as any).env?.VITE_JUDGE0_API_KEY;

    const results = await Promise.all(
      question.testCases.map(async (tc) => {
        try {
          if (useJudge) {
            const res = await judge0Run(code, LANGUAGE_IDS[language], tc.input);
            if (res.stderr) return { status: 'error' as const, stderr: res.stderr, expected: tc.output };
            const pass = res.stdout.trim() === tc.output.trim();
            return { status: pass ? 'pass' as const : 'fail' as const, stdout: res.stdout.trim(), expected: tc.output };
          } else {
            const res = await mockRun(question.id, code, tc);
            return { status: res.status, stdout: res.stdout, stderr: res.stderr, expected: tc.output };
          }
        } catch {
          // Network error — fall back to mock
          const res = await mockRun(question.id, code, tc);
          return { status: res.status, stdout: res.stdout, stderr: res.stderr, expected: tc.output };
        }
      })
    );

    const allPassed = results.every(r => r.status === 'pass');

    // Record submission in local history for accuracy tracking
    if (user) {
      const histKey = `codcraft_submissions_${user.id}_${question.level}`;
      const hist: boolean[] = JSON.parse(localStorage.getItem(histKey) || '[]');
      hist.unshift(allPassed);
      if (hist.length > 10) hist.pop();
      localStorage.setItem(histKey, JSON.stringify(hist));

      if (!allPassed) {
        // −5 XP penalty on failure
        try {
          const { data: prog } = await supabase.from('student_progress').select('wrong_count').eq('email', user.email).single();
          await supabase.from('student_progress').update({ wrong_count: (prog?.wrong_count ?? 0) + 1 }).eq('email', user.email);
        } catch {}
        setFloatXp('-5 XP');
        setTimeout(() => setFloatXp(null), 2500);
      }
    }

    setOutputs(results);
    setIsRunning(false);
  };

  // ── Submit Solution ───────────────────────────────────────
  const submitSolution = async () => {
    if (!user) return;
    const allPassed = outputs.every(o => o.status === 'pass');
    if (!allPassed) { setExecMsg('All test cases must pass before submitting!'); return; }
    setIsSubmitting(true);

    const xpEarned = isDaily ? question.xp_reward * 2 : question.xp_reward;

    try {
      const { data: prog } = await supabase.from('student_progress')
        .select('solved_count, wrong_count, solved_questions')
        .eq('email', user.email).single();

      const solvedQs: any[] = Array.isArray(prog?.solved_questions) ? [...prog.solved_questions] : [];
      const alreadySolvedIndex = solvedQs.findIndex((item: any) => {
        if (typeof item === 'number') return item === question.id;
        if (item && typeof item === 'object') return item.id === question.id;
        return false;
      });
      const alreadySolved = alreadySolvedIndex !== -1;

      // Filter out duplicate entries for this language of this question
      let updatedSolvedQs = solvedQs.filter((item: any) => {
        if (typeof item === 'number') return item !== question.id;
        if (item && typeof item === 'object') {
          return item.id !== question.id || item.lang !== language;
        }
        return true;
      });

      // Add the new submission object containing the code
      updatedSolvedQs.push({
        id: question.id,
        code: code,
        lang: language
      });

      const newSolvedCount = alreadySolved ? (prog?.solved_count ?? 0) : ((prog?.solved_count ?? 0) + 1);
      const potentialXp = newSolvedCount * 20 - (prog?.wrong_count ?? 0) * 5;
      const newXp = Math.max(0, potentialXp);
      const newLevel = newXp >= 300 ? 'pro' : newXp >= 100 ? 'mid' : 'beginner';

      await supabase.from('student_progress').update({
        solved_count: newSolvedCount,
        solved_questions: updatedSolvedQs,
        level: newLevel,
      }).eq('email', user.email);
      await supabase.from('student_profiles').update({ level: newLevel }).eq('id', user.id);

      localStorage.setItem(`codcraft_xp_${user.id}`, String(newXp));
      localStorage.setItem(`codcraft_level_${user.id}`, newLevel);
      localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');

      // Save code locally immediately
      const savedKey = `codcraft_code_${user.id}_${question.id}_${language}`;
      localStorage.setItem(savedKey, code);

      setSolved(true);
      setFloatXp(`+${xpEarned} XP${isDaily ? ' 🔥 Daily Bonus!' : ''}`);
      setTimeout(() => setFloatXp(null), 3500);
    } catch (err) {
      console.error("Submit failed:", err);
      // Offline fallback
      localStorage.setItem(`codcraft_solved_${user.id}_${question.id}`, 'true');
      const savedKey = `codcraft_code_${user.id}_${question.id}_${language}`;
      localStorage.setItem(savedKey, code);
      setSolved(true);
      setFloatXp(`+${xpEarned} XP${isDaily ? ' 🔥 Daily Bonus!' : ''}`);
      setTimeout(() => setFloatXp(null), 3500);
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPass = outputs.length > 0 && outputs.every(o => o.status === 'pass');
  const xpLabel = isDaily ? `+${question.xp_reward * 2} XP (2×)` : `+${question.xp_reward} XP`;

  // ── Render ────────────────────────────────────────────────
  return (
    <div style={{ height: '100dvh', display: 'flex', flexDirection: 'column', background: '#1e1e1e', overflow: 'hidden' }}>

      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div className="qp-topbar">
        <button className="qp-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft /> <span className="qp-back-text">Back</span>
        </button>

        <div className="qp-title-area">
          <span className="qp-qnum">#{question.id}</span>
          <span className="qp-qtitle">{question.title}</span>
          <span className={`badge badge-${question.level}`} style={{ fontSize: '10px', flexShrink: 0 }}>{question.level}</span>
          {isDaily && <span className="badge" style={{ fontSize: '10px', background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b55', flexShrink: 0 }}>🔥 Daily 2×</span>}
          {solved   && <span className="badge badge-green" style={{ fontSize: '10px', flexShrink: 0 }}>✓ Solved</span>}
        </div>

        <div className="qp-topbar-right">
          {/* Timer */}
          <div className={`timer-chip${timeLeft <= 60 ? ' danger' : ''}`} style={{ background: '#2a2a2a', border: '1px solid #444', color: timeLeft <= 60 ? '#ef4444' : '#ccc' }}>
            <TimerIcon /><span>{fmtTime(timeLeft)}</span>
          </div>

          {/* Language */}
          <select value={language} onChange={e => setLanguage(e.target.value)}
            style={{ padding: '0.3rem 0.6rem', fontSize: '0.78rem', background: '#2a2a2a', border: '1px solid #444', color: '#ccc', borderRadius: '6px', fontFamily: 'var(--font)', cursor: 'pointer' }}>
            <option value="python">Python 3</option>
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
            <option value="java">Java</option>
          </select>

          {/* Run */}
          <button onClick={runCode} disabled={isRunning || timeLeft <= 0}
            className="qp-run-btn"
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.38rem 0.85rem', background: 'transparent', border: '1px solid #555', borderRadius: '6px', color: '#ffffff', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap', opacity: (isRunning || timeLeft <= 0) ? 0.6 : 1 }}>
            <PlayIcon /> {isRunning ? 'Running…' : 'Run'}
          </button>

          {/* Submit */}
          <button
            onClick={submitSolution}
            disabled={isRunning || isSubmitting || solved || !allPass || timeLeft <= 0}
            style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', padding: '0.38rem 0.85rem', background: solved ? 'transparent' : allPass ? '#6366f1' : '#2a2a2a', border: `1px solid ${solved ? '#555' : allPass ? '#6366f1' : '#555'}`, borderRadius: '6px', color: solved ? '#94a3b8' : '#ffffff', fontSize: '0.78rem', fontWeight: 700, cursor: (solved || !allPass) ? 'not-allowed' : 'pointer', whiteSpace: 'nowrap', transition: 'all 0.18s', opacity: (solved || !allPass) ? 0.75 : 1 }}>
            <CheckIcon /> {isSubmitting ? 'Submitting…' : solved ? 'Solved! ✓' : `Submit (${xpLabel})`}
          </button>
        </div>
      </div>

      {/* ── Mobile Tab Switcher ──────────────────────────────── */}
      <div className="qp-mobile-tabs">
        <button className={`qp-mobile-tab${mobileTab === 'problem' ? ' active' : ''}`} onClick={() => setMobileTab('problem')}>📝 Problem & Tests</button>
        <button className={`qp-mobile-tab${mobileTab === 'editor' ? ' active' : ''}`} onClick={() => setMobileTab('editor')}>💻 Code Editor</button>
      </div>

      {/* ── Floating XP Toast ────────────────────────────────── */}
      {floatXp && (
        <div style={{ position: 'fixed', top: '4.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 999, padding: '0.6rem 1.5rem', background: '#1e1e1e', border: '1px solid #333', borderRadius: '24px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)', color: floatXp.startsWith('-') ? '#ef4444' : '#22c55e', fontWeight: 800, fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem', animation: 'slideDown 0.3s ease' }}>
          {floatXp.startsWith('-') ? '❄️' : '⭐'} {floatXp}
        </div>
      )}

      {/* ── Main Split ───────────────────────────────────────── */}
      <div className="qp-split">

        {/* ── Left: Problem Panel ──────────────────────────── */}
        <div className={`qp-problem-panel${mobileTab === 'editor' ? ' qp-hide-mobile' : ' qp-show-mobile'}${!panelOpen ? ' qp-panel-collapsed' : ''}`}
          style={{ background: 'var(--bg)' }}>

          {/* Collapse toggle */}
          <button className="qp-collapse-btn desktop-only" onClick={() => setPanelOpen(p => !p)} title={panelOpen ? 'Collapse' : 'Expand'}>
            {panelOpen ? <CollapseLeft /> : <CollapseRight />}
          </button>

          {panelOpen && (
            <div className="qp-problem-scroll">
              {/* Problem title & badge */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                  <h1 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text)', margin: 0 }}>{question.title}</h1>
                  <span className="brand-badge">{question.level} · {xpLabel}</span>
                  {isDaily && <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#f59e0b', background: '#f59e0b11', padding: '0.15rem 0.5rem', borderRadius: '20px', border: '1px solid #f59e0b44' }}>🔥 Daily Challenge</span>}
                </div>
                <div style={{ fontSize: '0.82rem', color: 'var(--text2)', lineHeight: 1.7, whiteSpace: 'pre-line', background: 'var(--bg2)', padding: '1rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                  {question.content}
                </div>
              </div>

              {/* Error / timer expired messages */}
              {execMsg && (
                <div style={{ padding: '0.6rem 0.85rem', background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', fontSize: '0.8rem', color: 'var(--danger)', display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  ⚠️ {execMsg}
                </div>
              )}

              {timeLeft <= 0 && !solved && (
                <div style={{ padding: '0.85rem', background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: 'var(--radius-sm)', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, color: 'var(--danger)', fontSize: '0.85rem', marginBottom: '0.5rem' }}>⌛ Time Expired</p>
                  <button className="btn btn-outline btn-sm" onClick={() => setTimeLeft(getTimeLimit(question.level))}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                    <RotateIcon /> Restart Timer
                  </button>
                </div>
              )}

              {/* Test Cases */}
              <div>
                <h2 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', marginBottom: '0.65rem' }}>
                  Test Cases
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  {outputs.map((out, idx) => (
                    <div key={idx} className={`tc-row ${out.status === 'pass' ? 'tc-pass' : (out.status === 'fail' || out.status === 'error') ? 'tc-fail' : out.status === 'running' ? 'tc-run' : ''}`}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>Test #{idx + 1}</span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 700, color: out.status === 'pass' ? 'var(--success)' : out.status === 'fail' || out.status === 'error' ? 'var(--danger)' : out.status === 'running' ? 'var(--gold)' : 'var(--muted)' }}>
                          {out.status === 'pass' ? '✓ Pass' : out.status === 'fail' ? '✗ Mismatch' : out.status === 'error' ? '✗ Error' : out.status === 'running' ? '⟳ Running…' : '● Idle'}
                        </span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.4rem', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>
                        <div>
                          <span style={{ color: 'var(--muted)', fontSize: '0.6rem', display: 'block', marginBottom: '0.1rem' }}>Input:</span>
                          <pre style={{ margin: 0, padding: '0.3rem 0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', overflowX: 'auto', color: 'var(--text2)' }}>{question.testCases[idx].input}</pre>
                        </div>
                        <div>
                          <span style={{ color: 'var(--muted)', fontSize: '0.6rem', display: 'block', marginBottom: '0.1rem' }}>Expected:</span>
                          <pre style={{ margin: 0, padding: '0.3rem 0.5rem', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '4px', overflowX: 'auto', color: 'var(--text2)' }}>{out.expected}</pre>
                        </div>
                      </div>
                      {out.stdout && out.status !== 'pass' && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <span style={{ color: 'var(--muted)', fontSize: '0.6rem', display: 'block', fontFamily: 'var(--mono)' }}>Your Output:</span>
                          <pre style={{ margin: 0, padding: '0.3rem 0.5rem', background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: '4px', overflowX: 'auto', color: 'var(--danger)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>{out.stdout}</pre>
                        </div>
                      )}
                      {out.stderr && (
                        <div style={{ marginTop: '0.35rem' }}>
                          <span style={{ color: 'var(--danger)', fontSize: '0.6rem', display: 'block', fontFamily: 'var(--mono)', fontWeight: 700 }}>Error:</span>
                          <pre style={{ margin: 0, padding: '0.3rem 0.5rem', background: 'var(--danger-bg)', border: '1px solid #fca5a5', borderRadius: '4px', whiteSpace: 'pre-wrap', overflowX: 'auto', color: 'var(--danger)', fontSize: '0.7rem', fontFamily: 'var(--mono)' }}>{out.stderr}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Right: Monaco Editor ─────────────────────────── */}
        <div 
          className={`qp-editor-panel${mobileTab === 'problem' ? ' qp-hide-mobile' : ' qp-show-mobile'}`}
          style={{ position: 'relative', cursor: 'text' }}
          onClick={() => {
            if (editorRef.current) {
              editorRef.current.focus();
            }
          }}
        >

          {/* Timer expired overlay */}
          {timeLeft <= 0 && !solved && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 20, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem', textAlign: 'center', padding: '2rem' }}>
              <span style={{ fontSize: '2.5rem' }}>⌛</span>
              <h3 style={{ color: '#fff', fontWeight: 800, margin: 0 }}>Time Expired</h3>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '0.82rem', maxWidth: '240px' }}>Restart the timer to continue coding.</p>
              <button className="btn btn-sm" onClick={() => setTimeLeft(getTimeLimit(question.level))}
                style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', background: '#333', border: '1px solid #555', color: '#fff', borderRadius: '6px', padding: '0.45rem 1rem', cursor: 'pointer' }}>
                <RotateIcon /> Restart Timer
              </button>
            </div>
          )}

          <Editor
            height="100%"
            language={language === 'c' ? 'cpp' : language}
            theme="vs-dark"
            value={code}
            onChange={v => setCode(v || '')}
            onMount={(editor, monaco) => {
              editorRef.current = editor;
              try {
                monaco.editor.remeasureFonts();
                editor.layout();
                editor.focus();
                const pos = editor.getPosition();
                if (!pos) editor.setPosition({ lineNumber: 1, column: 1 });
              } catch (e) {}

              setTimeout(() => {
                try {
                  monaco.editor.remeasureFonts();
                  editor.layout();
                  editor.focus();
                } catch (e) {}
              }, 100);
            }}
            options={{
              minimap: { enabled: false },
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
              cursorBlinking: 'blink',
              cursorSmoothCaretAnimation: 'off',
              cursorStyle: 'line',
              cursorWidth: 3,
              cursorSurroundingLines: 2,
              padding: { top: 16, bottom: 16 },
              readOnly: (timeLeft <= 0),
              wordWrap: 'on',
              lineNumbersMinChars: 3,
              scrollBeyondLastLine: false,
              smoothScrolling: true,
              renderLineHighlight: 'all',
              bracketPairColorization: { enabled: true },
              dragAndDrop: false,
              fixedOverflowWidgets: true
            }}
          />
        </div>
      </div>

      {/* ── Slide-down animation ──────────────────────────── */}
      <style>{`
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
      {/* ── Mobile Sticky Bottom Action Bar ───────────────── */}
      <div className="qp-mobile-bottom-bar">
        <button 
          onClick={runCode} 
          disabled={isRunning || timeLeft <= 0} 
          className="btn btn-outline" 
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', padding: '0.65rem 0', color: '#ffffff' }}
        >
          <PlayIcon /> {isRunning ? 'Running…' : 'Run Code'}
        </button>
        <button 
          onClick={submitSolution} 
          disabled={isRunning || isSubmitting || solved || !allPass || timeLeft <= 0}
          className={`btn ${solved ? 'btn-outline' : allPass ? 'btn-primary' : 'btn-outline'}`}
          style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', opacity: (solved || (!allPass && !solved)) ? 0.75 : 1, padding: '0.65rem 0', color: '#ffffff' }}
        >
          <CheckIcon /> {isSubmitting ? 'Submitting…' : solved ? 'Solved! ✓' : `Submit (${xpLabel})`}
        </button>
      </div>

      {/* ── AI Hint Assistant (optional floating button) ──── */}
      <AIHintAssistant
        questionTitle={question.title}
        questionContent={question.content}
        questionLevel={question.level}
        language={language}
        code={code}
        testCases={question.testCases}
      />
    </div>
  );
};

export default QuestionPage;
