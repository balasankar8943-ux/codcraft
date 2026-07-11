// src/components/AIHintAssistant.tsx
// A friendly chatbot-style AI coding assistant that gives hints — never full solutions.
import React, { useState, useRef, useEffect } from 'react';

// ── Icons ────────────────────────────────────────────────────
const ChatBotIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
    <rect x="3" y="7" width="18" height="12" rx="3" fill="currentColor" opacity="0.15" stroke="currentColor" strokeWidth="1.5"/>
    <circle cx="9" cy="13" r="1.5" fill="currentColor"/>
    <circle cx="15" cy="13" r="1.5" fill="currentColor"/>
    <path d="M9 17h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M8 7V5a4 4 0 018 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const SendIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
  </svg>
);
const CloseIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);
const MinimizeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const RefreshIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>
  </svg>
);

// ── Types ────────────────────────────────────────────────────
type Message = {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
};

type Props = {
  questionTitle: string;
  questionContent: string;
  questionLevel: string;
  language: string;
  code: string;
  testCases: { input: string; output: string }[];
};

// ── System Prompt (hint-only, friendly) ──────────────────────
const buildSystemPrompt = (p: Props) => `You are CodCraft Buddy 🤖 — a warm, encouraging AI coding mentor for engineering students on the CodCraft platform.

## YOUR GOLDEN RULES:
1. **NEVER write complete code solutions.** Not even "almost complete" ones.
2. **NEVER give the final answer.** The student must write the code themselves.
3. Give hints in a progressive way: start vague, get more specific only if they ask again.
4. Use analogies, pseudocode snippets (max 2-3 lines), and conceptual explanations.
5. If the student asks you to "just give the code" or "write it for me", politely refuse and offer a nudge instead.
6. Be warm, patient, and use emojis sparingly to feel friendly (1-2 per message max).
7. Keep responses concise — under 150 words ideally. Students are on a timer!
8. If you detect a bug in their code, describe WHERE the issue is and WHAT kind of mistake it is, but don't fix it for them.
9. Celebrate small wins! If they're on the right track, tell them.

## CONTEXT:
- **Problem:** "${p.questionTitle}" (${p.questionLevel} level)
- **Description:** ${p.questionContent.slice(0, 500)}
- **Language:** ${p.language}
- **Test Cases:** ${p.testCases.map((tc, i) => `TC${i+1}: Input="${tc.input}" → Expected="${tc.output}"`).join('; ')}
- **Student's Current Code:**
\`\`\`${p.language}
${p.code.slice(0, 1500)}
\`\`\`

Help this student learn, don't solve it for them!`;

const getTimeStr = () => {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const AI_MODELS = [
  { id: 'anthropic/claude-3-haiku', label: 'Haiku 3', emoji: '🟣' },
  { id: 'deepseek/deepseek-chat-v3-0324', label: 'DeepSeek V3', emoji: '🔵' },
  { id: 'qwen/qwen3-8b', label: 'Qwen 3', emoji: '🟠' },
];

// ── Main Component ───────────────────────────────────────────
const AIHintAssistant: React.FC<Props> = (props) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [unread, setUnread] = useState(0);
  const [selectedModel, setSelectedModel] = useState(AI_MODELS[0].id);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen]);

  const sendMessage = async (text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || isLoading) return;

    const userMsg: Message = { role: 'user', content: trimmed, timestamp: getTimeStr() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);
    setHintsUsed(h => h + 1);

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_OPENROUTER_API_KEY}`,
          'HTTP-Referer': 'https://codcraft.in',
          'X-Title': 'CodCraft AI Hints',
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: buildSystemPrompt(props) },
            ...newMessages.map(m => ({ role: m.role, content: m.content })),
          ],
          max_tokens: 350,
          temperature: 0.7,
        }),
      });

      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || 'Hmm, I couldn\'t think of a hint right now. Try asking differently! 🤔';

      setMessages(prev => [...prev, { role: 'assistant', content: reply, timestamp: getTimeStr() }]);
      if (!isOpen) setUnread(u => u + 1);
    } catch (err) {
      console.error('AI Hint error:', err);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: '😅 Oops! I had trouble connecting. Check your internet and try again in a moment.',
        timestamp: getTimeStr(),
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const quickPrompts = [
    { emoji: '💡', text: 'Give me a hint to start' },
    { emoji: '🐛', text: 'I think my code has a bug' },
    { emoji: '🤔', text: 'What approach should I use?' },
    { emoji: '📝', text: 'Explain the problem simply' },
  ];

  // ── Render ─────────────────────────────────────────────────
  return (
    <>
      {/* ══ Floating Chat Button ═══════════════════════════ */}
      <button
        onClick={() => setIsOpen(o => !o)}
        style={{
          position: 'fixed',
          bottom: window.innerWidth < 768 ? '5rem' : '1.5rem',
          right: '1.25rem',
          zIndex: 999,
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          border: 'none',
          background: isOpen
            ? '#3f3f46'
            : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isOpen
            ? '0 2px 12px rgba(0,0,0,0.3)'
            : '0 4px 24px rgba(99, 102, 241, 0.5)',
          transition: 'all 0.3s cubic-bezier(0.4,0,0.2,1)',
          transform: isOpen ? 'rotate(0deg)' : 'rotate(0deg)',
        }}
      >
        {isOpen ? <CloseIcon /> : <ChatBotIcon />}
        {/* Unread badge */}
        {!isOpen && unread > 0 && (
          <span style={{
            position: 'absolute', top: '-2px', right: '-2px',
            width: '20px', height: '20px', borderRadius: '50%',
            background: '#ef4444', color: '#fff',
            fontSize: '0.65rem', fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '2px solid #1e1e1e',
          }}>{unread}</span>
        )}
      </button>

      {/* ══ Chat Window ════════════════════════════════════ */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: window.innerWidth < 768 ? 0 : '6rem',
          right: window.innerWidth < 768 ? 0 : '1.25rem',
          width: window.innerWidth < 768 ? '100%' : '370px',
          height: window.innerWidth < 768 ? '80dvh' : '500px',
          zIndex: 998,
          display: 'flex',
          flexDirection: 'column',
          background: '#0f0f12',
          borderRadius: window.innerWidth < 768 ? '18px 18px 0 0' : '18px',
          border: '1px solid #27272a',
          boxShadow: '0 12px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(99,102,241,0.1)',
          animation: 'cbSlideUp 0.3s cubic-bezier(0.16,1,0.3,1)',
          overflow: 'hidden',
        }}>

          {/* ── Header ─────────────────────────────────────── */}
          <div style={{
            padding: '0.85rem 1rem',
            background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
            display: 'flex',
            alignItems: 'center',
            gap: '0.65rem',
            flexShrink: 0,
          }}>
            {/* Bot avatar */}
            <div style={{
              width: '40px', height: '40px', borderRadius: '12px',
              background: 'linear-gradient(135deg, #6366f1, #a855f7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, position: 'relative',
            }}>
              <span style={{ fontSize: '1.2rem' }}>🤖</span>
              {/* Online dot */}
              <span style={{
                position: 'absolute', bottom: '-1px', right: '-1px',
                width: '12px', height: '12px', borderRadius: '50%',
                background: '#22c55e', border: '2px solid #1e1b4b',
              }}/>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#e0e7ff', lineHeight: 1.2 }}>
                CodCraft Buddy
              </div>
              <div style={{ fontSize: '0.68rem', color: '#a5b4fc', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#22c55e', display: 'inline-block' }}/>
                Online · Hints only
              </div>
            </div>
            <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
              {hintsUsed > 0 && (
                <span style={{
                  fontSize: '0.6rem', color: '#c7d2fe', background: 'rgba(99,102,241,0.25)',
                  padding: '0.15rem 0.45rem', borderRadius: '8px', fontWeight: 600,
                }}>
                  {hintsUsed} hint{hintsUsed > 1 ? 's' : ''}
                </span>
              )}
              <button onClick={() => setIsOpen(false)} style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
                padding: '0.3rem', cursor: 'pointer', color: '#c7d2fe',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <MinimizeIcon />
              </button>
            </div>
          </div>

          {/* ── Toolbar (Model Selector + Refresh) ─────────── */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem',
            padding: '0.45rem 0.75rem',
            background: '#111114',
            borderBottom: '1px solid #1f1f23',
            flexShrink: 0,
          }}>
            <select
              value={selectedModel}
              onChange={e => setSelectedModel(e.target.value)}
              style={{
                flex: 1, padding: '0.35rem 0.5rem', fontSize: '0.72rem',
                background: '#1a1a1f', border: '1px solid #27272a',
                borderRadius: '8px', color: '#a1a1aa', fontFamily: 'var(--font)',
                cursor: 'pointer', outline: 'none',
              }}
            >
              {AI_MODELS.map(m => (
                <option key={m.id} value={m.id}>{m.emoji} {m.label}</option>
              ))}
            </select>
            <button
              onClick={() => { setMessages([]); setHintsUsed(0); }}
              title="Clear chat"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: '0.3rem', padding: '0.35rem 0.6rem',
                background: '#1a1a1f', border: '1px solid #27272a',
                borderRadius: '8px', color: '#71717a', cursor: 'pointer',
                fontSize: '0.68rem', fontFamily: 'var(--font)', fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = '#ef4444'; e.currentTarget.style.color = '#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#71717a'; }}
            >
              <RefreshIcon /> Clear
            </button>
          </div>

          {/* ── Messages ───────────────────────────────────── */}
          <div ref={scrollRef} style={{
            flex: 1, overflowY: 'auto', padding: '0.85rem',
            display: 'flex', flexDirection: 'column', gap: '0.5rem',
          }}>
            {/* Welcome state */}
            {messages.length === 0 && !isLoading && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '1.25rem 0.5rem 0.75rem' }}>
                <div style={{
                  width: '60px', height: '60px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #312e81, #4f46e5)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: '0.75rem', boxShadow: '0 4px 16px rgba(99,102,241,0.3)',
                }}>
                  <span style={{ fontSize: '1.8rem' }}>👋</span>
                </div>
                <h3 style={{ fontSize: '1rem', fontWeight: 800, color: '#e0e7ff', marginBottom: '0.25rem', textAlign: 'center' }}>
                  Hey! Need a nudge?
                </h3>
                <p style={{ fontSize: '0.75rem', color: '#71717a', lineHeight: 1.55, textAlign: 'center', maxWidth: '260px', marginBottom: '1rem' }}>
                  I'll guide you with hints — the code is yours to write! Pick a question below or type your own. 💪
                </p>

                {/* Quick prompts as chat chips */}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', justifyContent: 'center' }}>
                  {quickPrompts.map((qp, i) => (
                    <button key={i} onClick={() => sendMessage(`${qp.emoji} ${qp.text}`)}
                      style={{
                        padding: '0.45rem 0.75rem', fontSize: '0.72rem',
                        background: 'transparent', border: '1px solid #27272a',
                        borderRadius: '20px', color: '#a1a1aa', cursor: 'pointer',
                        fontFamily: 'var(--font)', transition: 'all 0.15s',
                        display: 'flex', alignItems: 'center', gap: '0.3rem',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = '#6366f1'; e.currentTarget.style.color = '#c7d2fe'; e.currentTarget.style.background = '#1e1b4b'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = '#27272a'; e.currentTarget.style.color = '#a1a1aa'; e.currentTarget.style.background = 'transparent'; }}
                    >
                      <span>{qp.emoji}</span> {qp.text}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Chat bubbles */}
            {messages.map((msg, i) => {
              const isUser = msg.role === 'user';
              const showAvatar = !isUser && (i === 0 || messages[i - 1]?.role === 'user');
              return (
                <div key={i} style={{
                  display: 'flex',
                  flexDirection: isUser ? 'row-reverse' : 'row',
                  alignItems: 'flex-end',
                  gap: '0.4rem',
                  marginTop: showAvatar ? '0.35rem' : '0',
                }}>
                  {/* Bot avatar */}
                  {!isUser && (
                    <div style={{
                      width: '28px', height: '28px', borderRadius: '50%',
                      background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                      display: showAvatar ? 'flex' : 'none',
                      alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0, fontSize: '0.8rem',
                    }}>
                      🤖
                    </div>
                  )}
                  {!isUser && !showAvatar && <div style={{ width: '28px', flexShrink: 0 }} />}

                  <div style={{ maxWidth: '80%', display: 'flex', flexDirection: 'column', alignItems: isUser ? 'flex-end' : 'flex-start' }}>
                    <div style={{
                      padding: '0.6rem 0.85rem',
                      borderRadius: isUser ? '14px 14px 4px 14px' : '14px 14px 14px 4px',
                      background: isUser
                        ? 'linear-gradient(135deg, #4f46e5, #6366f1)'
                        : '#18181b',
                      color: isUser ? '#f1f5f9' : '#d4d4d8',
                      fontSize: '0.8rem',
                      lineHeight: 1.6,
                      border: isUser ? 'none' : '1px solid #27272a',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                    }}>
                      {msg.content}
                    </div>
                    <span style={{ fontSize: '0.58rem', color: '#52525b', marginTop: '0.2rem', padding: '0 0.25rem' }}>
                      {msg.timestamp}
                    </span>
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {isLoading && (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.4rem', marginTop: '0.35rem' }}>
                <div style={{
                  width: '28px', height: '28px', borderRadius: '50%',
                  background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, fontSize: '0.8rem',
                }}>
                  🤖
                </div>
                <div style={{
                  padding: '0.65rem 1rem', borderRadius: '14px 14px 14px 4px',
                  background: '#18181b', border: '1px solid #27272a',
                  display: 'flex', gap: '0.25rem', alignItems: 'center',
                }}>
                  <span className="cb-dot" style={{ animationDelay: '0s' }}/>
                  <span className="cb-dot" style={{ animationDelay: '0.15s' }}/>
                  <span className="cb-dot" style={{ animationDelay: '0.3s' }}/>
                </div>
              </div>
            )}
          </div>

          {/* ── Input bar ──────────────────────────────────── */}
          <div style={{
            padding: '0.6rem 0.75rem',
            borderTop: '1px solid #1c1c1f',
            background: '#0c0c0f',
            display: 'flex',
            gap: '0.45rem',
            alignItems: 'flex-end',
            flexShrink: 0,
          }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask for a hint…"
              disabled={isLoading}
              rows={1}
              style={{
                flex: 1,
                padding: '0.55rem 0.85rem',
                fontSize: '0.82rem',
                background: '#18181b',
                border: '1px solid #27272a',
                borderRadius: '12px',
                color: '#e4e4e7',
                fontFamily: 'var(--font)',
                outline: 'none',
                resize: 'none',
                maxHeight: '80px',
                lineHeight: 1.4,
                transition: 'border-color 0.15s',
              }}
              onFocus={e => { e.currentTarget.style.borderColor = '#6366f1'; }}
              onBlur={e => { e.currentTarget.style.borderColor = '#27272a'; }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              style={{
                width: '40px', height: '40px',
                borderRadius: '12px', border: 'none',
                background: input.trim() && !isLoading
                  ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                  : '#18181b',
                color: input.trim() && !isLoading ? '#fff' : '#3f3f46',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.2s',
              }}
            >
              <SendIcon />
            </button>
          </div>

          {/* Powered by label */}
          <div style={{
            textAlign: 'center', padding: '0.3rem',
            fontSize: '0.55rem', color: '#3f3f46',
            background: '#0c0c0f', flexShrink: 0,
          }}>
            Powered by CodCraft AI · Hints only, no spoilers
          </div>
        </div>
      )}

      {/* ── Animations ─────────────────────────────────────── */}
      <style>{`
        @keyframes cbSlideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .cb-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #6366f1;
          animation: cbBounce 1.4s infinite ease-in-out both;
        }
        @keyframes cbBounce {
          0%, 80%, 100% { transform: scale(0.4); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </>
  );
};

export default AIHintAssistant;
