// src/components/FreeCompilerPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Terminal, Code2, AlertCircle, Save, Folder, FolderPlus,
  FilePlus, Trash2, Edit3, ChevronRight, ChevronDown, FileCode, X, Check, Loader2
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import AIHintAssistant from './AIHintAssistant';
import {
  fetchUserFiles, createFileItem, updateFileItem, deleteFileItem, inferLanguageFromName
} from '../services/fileService';
import type { FileItem } from '../services/fileService';

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  cpp: 54,
  c: 50,
  java: 62
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  python: `# Free Python 3 Playground\ndef main():\n    name = "Student"\n    print(f"Hello, {name}! Welcome to CodCraft Cloud IDE.")\n    numbers = [5, 2, 9, 1, 7]\n    numbers.sort()\n    print("Sorted numbers:", numbers)\n\nif __name__ == "__main__":\n    main()\n`,
  cpp: `// Free C++ Playground\n#include <iostream>\n#include <vector>\n#include <algorithm>\n\nusing namespace std;\n\nint main() {\n    cout << "Hello from CodCraft C++ Compiler!" << endl;\n    vector<int> nums = {5, 2, 9, 1, 7};\n    sort(nums.begin(), nums.end());\n    cout << "Sorted vector: ";\n    for (int n : nums) cout << n << " ";\n    cout << endl;\n    return 0;\n}\n`,
  c: `/* Free C Playground */\n#include <stdio.h>\n\nint main() {\n    printf("Hello from CodCraft C Compiler!\\n");\n    int a = 10, b = 25;\n    printf("Sum of %d and %d is %d\\n", a, b, a + b);\n    return 0;\n}\n`,
  java: `// Free Java Playground\nimport java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from CodCraft Java Compiler!");\n        List<Integer> list = Arrays.asList(5, 2, 9, 1, 7);\n        Collections.sort(list);\n        System.out.println("Sorted list: " + list);\n    }\n}\n`
};

const FreeCompilerPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'sandbox_user_id';

  // File tree states
  const [files, setFiles] = useState<FileItem[]>([]);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({ folder_src: true });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Editing / Renaming states
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');
  const [isCreatingItem, setIsCreatingItem] = useState<'file' | 'folder' | null>(null);
  const [newItemName, setNewItemName] = useState<string>('');

  // Code & Editor states
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');

  // Execution states
  const [stdin, setStdin] = useState<string>('');
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [execTime, setExecTime] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  // Load user files on initial render or user change
  useEffect(() => {
    const loadFiles = async () => {
      const items = await fetchUserFiles(userId);
      setFiles(items);
      const firstFile = items.find(i => i.type === 'file');
      if (firstFile) {
        setOpenTabIds([firstFile.id]);
        setActiveFileId(firstFile.id);
        setCode(firstFile.content);
        setLanguage(firstFile.language || inferLanguageFromName(firstFile.name));
      }
    };
    loadFiles();
  }, [userId]);

  // Sync active file content & language when active tab changes
  useEffect(() => {
    if (!activeFileId) return;
    const current = files.find(f => f.id === activeFileId);
    if (current) {
      setCode(current.content);
      const lang = current.language || inferLanguageFromName(current.name);
      setLanguage(lang);
      setSaveStatus('saved');
    }
  }, [activeFileId, files]);

  // Auto-save debounced code changes to database
  useEffect(() => {
    if (!activeFileId) return;
    const current = files.find(f => f.id === activeFileId);
    if (!current || current.content === code) return;

    setSaveStatus('dirty');
    const timer = setTimeout(async () => {
      setSaveStatus('saving');
      await updateFileItem(activeFileId, userId, { content: code, language });
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: code, language } : f));
      setSaveStatus('saved');
    }, 800);

    return () => clearTimeout(timer);
  }, [code, activeFileId, language, userId]);

  // Manual save trigger
  const handleManualSave = async () => {
    if (!activeFileId) return;
    setSaveStatus('saving');
    await updateFileItem(activeFileId, userId, { content: code, language });
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: code, language } : f));
    setSaveStatus('saved');
  };

  // Create new File or Folder
  const handleCreateNewItem = async () => {
    if (!newItemName.trim() || !isCreatingItem) return;
    const name = newItemName.trim();
    const item = await createFileItem(
      userId,
      name,
      isCreatingItem,
      selectedFolderId,
      isCreatingItem === 'file' ? (DEFAULT_TEMPLATES[inferLanguageFromName(name)] || '') : '',
      isCreatingItem === 'file' ? inferLanguageFromName(name) : ''
    );

    setFiles(prev => [...prev, item]);
    setNewItemName('');
    setIsCreatingItem(null);

    if (item.type === 'file') {
      setOpenTabIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
      setActiveFileId(item.id);
    }
  };

  // Rename File or Folder
  const handleConfirmRename = async (id: string) => {
    if (!renameInput.trim()) {
      setRenamingId(null);
      return;
    }
    const name = renameInput.trim();
    const item = files.find(f => f.id === id);
    const updates: Partial<FileItem> = { name };
    if (item?.type === 'file') {
      updates.language = inferLanguageFromName(name);
    }

    await updateFileItem(id, userId, updates);
    setFiles(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
    setRenamingId(null);
  };

  // Delete File or Folder
  const handleDeleteItem = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    await deleteFileItem(id, userId);

    setFiles(prev => prev.filter(f => f.id !== id && f.parent_folder_id !== id));
    setOpenTabIds(prev => prev.filter(tId => tId !== id));
    if (activeFileId === id) {
      const remainingTabs = openTabIds.filter(tId => tId !== id);
      setActiveFileId(remainingTabs.length > 0 ? remainingTabs[remainingTabs.length - 1] : null);
    }
  };

  // Open file in tabs
  const handleOpenFile = (file: FileItem) => {
    if (file.type === 'folder') {
      setExpandedFolderIds(prev => ({ ...prev, [file.id]: !prev[file.id] }));
      setSelectedFolderId(file.id);
      return;
    }
    if (!openTabIds.includes(file.id)) {
      setOpenTabIds(prev => [...prev, file.id]);
    }
    setActiveFileId(file.id);
  };

  // Close tab
  const handleCloseTab = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const remaining = openTabIds.filter(tId => tId !== id);
    setOpenTabIds(remaining);
    if (activeFileId === id) {
      setActiveFileId(remaining.length > 0 ? remaining[remaining.length - 1] : null);
    }
  };

  // Run Code via Judge0 API
  const handleRunCode = async () => {
    if (!code) return;
    setIsRunning(true);
    setStdout('');
    setStderr('');
    setExecTime(null);
    const startTime = performance.now();

    try {
      const apiKey = (import.meta as any).env?.VITE_JUDGE0_API_KEY;
      const langId = LANGUAGE_IDS[language] || 71;
      let resOutput = { stdout: '', stderr: '' };

      const body = JSON.stringify({ source_code: code, language_id: langId, stdin: stdin });

      if (apiKey) {
        const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
            'x-rapidapi-key': apiKey
          },
          body
        });

        if (response.ok) {
          const data = await response.json();
          resOutput = { stdout: data.stdout || '', stderr: data.stderr || data.compile_output || data.message || '' };
        } else {
          const pubRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body
          });
          const data = await pubRes.json();
          resOutput = { stdout: data.stdout || '', stderr: data.stderr || data.compile_output || '' };
        }
      } else {
        const pubRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body
        });
        const data = await pubRes.json();
        resOutput = { stdout: data.stdout || '', stderr: data.stderr || data.compile_output || '' };
      }

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setExecTime(`${elapsed}s`);
      setStdout(resOutput.stdout || (resOutput.stderr ? '' : '(Program executed cleanly with no output)'));
      setStderr(resOutput.stderr || '');
    } catch (err: any) {
      setStderr(err?.message || 'Execution error. Check code syntax or network connection.');
    } finally {
      setIsRunning(false);
    }
  };

  // Render file tree recursively
  const renderTreeNodes = (parentId: string | null = null, depth = 0) => {
    const children = files.filter(f => f.parent_folder_id === parentId);

    return children.map(item => {
      const isFolder = item.type === 'folder';
      const isExpanded = expandedFolderIds[item.id];
      const isActive = activeFileId === item.id;
      const isSelected = selectedFolderId === item.id;

      return (
        <div key={item.id} style={{ paddingLeft: depth > 0 ? '0.75rem' : '0' }}>
          <div
            onClick={() => handleOpenFile(item)}
            className={`ide-tree-node ${isActive ? 'active' : ''} ${isSelected ? 'selected' : ''}`}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '0.35rem 0.6rem', borderRadius: '4px', cursor: 'pointer',
              fontSize: '0.8rem', color: isActive ? 'var(--indigo)' : 'var(--text)',
              background: isActive ? 'var(--indigo-bg)' : isSelected ? 'var(--bg3)' : 'transparent',
              transition: 'all 0.15s'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {isFolder ? (
                <>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={15} style={{ color: 'var(--gold)' }} />
                </>
              ) : (
                <FileCode size={15} style={{ color: 'var(--indigo)' }} />
              )}

              {renamingId === item.id ? (
                <input
                  type="text"
                  value={renameInput}
                  autoFocus
                  onChange={e => setRenameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmRename(item.id)}
                  onBlur={() => handleConfirmRename(item.id)}
                  style={{ fontSize: '0.78rem', padding: '0.1rem 0.3rem', borderRadius: '3px', border: '1px solid var(--indigo)', outline: 'none' }}
                />
              ) : (
                <span style={{ fontWeight: isFolder ? 700 : 500 }}>{item.name}</span>
              )}
            </div>

            <div className="tree-action-btns" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', opacity: 0.7 }}>
              <button
                title="Rename"
                onClick={e => { e.stopPropagation(); setRenamingId(item.id); setRenameInput(item.name); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: '2px' }}
              >
                <Edit3 size={13} />
              </button>
              <button
                title="Delete"
                onClick={e => { e.stopPropagation(); handleDeleteItem(item.id, item.name); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', padding: '2px' }}
              >
                <Trash2 size={13} />
              </button>
            </div>
          </div>

          {isFolder && isExpanded && (
            <div style={{ borderLeft: '1px solid var(--border)', marginLeft: '0.65rem' }}>
              {renderTreeNodes(item.id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const activeFile = files.find(f => f.id === activeFileId);

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', minHeight: 'calc(100vh - 70px)' }}>
      
      {/* ── IDE Top Header ───────────────────────────────────── */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(147, 51, 234, 0.08) 100%)',
        border: '1px solid #c7d2fe', borderRadius: 'var(--radius)', padding: '0.85rem 1.25rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '38px', height: '38px', borderRadius: '10px', background: 'var(--indigo-bg)', color: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Code2 size={22} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h1 style={{ fontSize: '1.25rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                Cloud IDE Compiler
              </h1>
              <span className="badge badge-indigo" style={{ fontSize: '0.6rem' }}>DB Synced ⚡</span>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
              Create folders, manage files, auto-save code, and compile in Python, C++, C, or Java.
            </p>
          </div>
        </div>

        {/* Global IDE Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <select
            value={language}
            onChange={e => {
              const newLang = e.target.value;
              setLanguage(newLang);
              if (activeFileId) {
                updateFileItem(activeFileId, userId, { language: newLang });
                setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, language: newLang } : f));
              }
            }}
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', color: 'var(--text)', cursor: 'pointer' }}
          >
            <option value="python">🐍 Python 3</option>
            <option value="cpp">⚡ C++ (GCC)</option>
            <option value="c">⚙️ C (GCC)</option>
            <option value="java">☕ Java</option>
          </select>

          <button
            onClick={handleManualSave}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            <span>{saveStatus === 'saving' ? 'Saving…' : saveStatus === 'saved' ? 'Saved ✓' : 'Save'}</span>
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Play size={14} />
            <span>{isRunning ? 'Running…' : 'Run Code'}</span>
          </button>
        </div>
      </div>

      {/* ── IDE Body Grid Layout ──────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr 340px', gap: '1rem', flex: 1, minHeight: '620px' }}>
        
        {/* ── Left Sidebar: File Explorer Tree ─────────────────── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
              📁 Explorer
            </span>
            <div style={{ display: 'flex', gap: '0.25rem' }}>
              <button
                title="New File"
                onClick={() => { setIsCreatingItem('file'); setNewItemName(''); }}
                style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--indigo)' }}
              >
                <FilePlus size={16} />
              </button>
              <button
                title="New Folder"
                onClick={() => { setIsCreatingItem('folder'); setNewItemName(''); }}
                style={{ padding: '0.25rem', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--gold)' }}
              >
                <FolderPlus size={16} />
              </button>
            </div>
          </div>

          {/* New Item Dialog Inline */}
          {isCreatingItem && (
            <div style={{ padding: '0.65rem', borderBottom: '1px solid var(--border)', background: 'var(--bg3)', display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
              <input
                type="text"
                placeholder={isCreatingItem === 'file' ? 'filename.py' : 'Folder name'}
                value={newItemName}
                autoFocus
                onChange={e => setNewItemName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleCreateNewItem()}
                style={{ flex: 1, padding: '0.3rem 0.5rem', fontSize: '0.75rem', borderRadius: '4px', border: '1px solid var(--border)', outline: 'none' }}
              />
              <button onClick={handleCreateNewItem} style={{ background: 'var(--indigo)', color: '#fff', border: 'none', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer' }}>
                <Check size={14} />
              </button>
              <button onClick={() => setIsCreatingItem(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}>
                <X size={14} />
              </button>
            </div>
          )}

          {/* File Tree List */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem' }}>
            {renderTreeNodes(null, 0)}
          </div>
        </div>

        {/* ── Middle Column: Tabs & Monaco Editor ─────────────── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          {/* File Tabs Bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#18181b', overflowX: 'auto' }}>
            {openTabIds.map(tId => {
              const file = files.find(f => f.id === tId);
              if (!file) return null;
              const isActive = activeFileId === file.id;

              return (
                <div
                  key={file.id}
                  onClick={() => setActiveFileId(file.id)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 0.85rem',
                    fontSize: '0.78rem', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
                    background: isActive ? '#1e1e1e' : 'transparent', color: isActive ? '#6366f1' : '#a1a1aa',
                    borderRight: '1px solid #27272a', borderTop: isActive ? '2px solid #6366f1' : '2px solid transparent'
                  }}
                >
                  <FileCode size={14} />
                  <span>{file.name}</span>
                  <button
                    onClick={e => handleCloseTab(e, file.id)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', display: 'flex', alignItems: 'center', padding: '2px' }}
                  >
                    <X size={12} />
                  </button>
                </div>
              );
            })}
          </div>

          {/* Editor Container */}
          <div style={{ flex: 1, position: 'relative', background: '#1e1e1e' }}>
            <Editor
              height="100%"
              language={language === 'c' ? 'cpp' : language}
              theme="vs-dark"
              value={code}
              onChange={v => setCode(v || '')}
              onMount={editor => { editorRef.current = editor; }}
              options={{
                fontSize: 14,
                fontFamily: '"JetBrains Mono", "Fira Code", Consolas, monospace',
                automaticLayout: true,
                tabSize: 4,
                padding: { top: 16, bottom: 16 },
                wordWrap: 'on',
                smoothScrolling: true,
                renderLineHighlight: 'all',
                bracketPairColorization: { enabled: true }
              }}
            />
          </div>
        </div>

        {/* ── Right Column: Input / Output Console ───────────────── */}
        <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          
          <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <Terminal size={15} /> Console Output
            </span>
            {execTime && <span style={{ fontSize: '0.72rem', color: 'var(--success)', fontWeight: 700 }}>⚡ Done in {execTime}</span>}
          </div>

          <div style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', flex: 1, overflowY: 'auto' }}>
            {/* Stdin input */}
            <div>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                Standard Input (stdin):
              </label>
              <textarea
                rows={2}
                placeholder="Optional input for code..."
                value={stdin}
                onChange={e => setStdin(e.target.value)}
                style={{ width: '100%', padding: '0.45rem 0.6rem', fontSize: '0.78rem', fontFamily: 'var(--mono)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg)', outline: 'none', resize: 'vertical' }}
              />
            </div>

            {/* Stdout display */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
              <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.3rem' }}>
                Standard Output (stdout):
              </label>
              <pre style={{
                flex: 1, minHeight: '120px', padding: '0.75rem', background: '#09090b', color: '#38bdf8',
                borderRadius: 'var(--radius-sm)', border: '1px solid #27272a', fontFamily: 'var(--mono)',
                fontSize: '0.78rem', whiteSpace: 'pre-wrap', overflowY: 'auto'
              }}>
                {stdout || (isRunning ? 'Running program...' : 'Click "Run Code" to compile & view output.')}
              </pre>
            </div>

            {/* Stderr display */}
            {stderr && (
              <div>
                <label style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--danger)', display: 'flex', alignItems: 'center', gap: '0.2rem', marginBottom: '0.3rem' }}>
                  <AlertCircle size={13} /> Compiler Stderr / Errors:
                </label>
                <pre style={{
                  padding: '0.65rem', background: '#450a0a', color: '#fca5a5',
                  borderRadius: 'var(--radius-sm)', border: '1px solid #7f1d1d', fontFamily: 'var(--mono)',
                  fontSize: '0.75rem', whiteSpace: 'pre-wrap', overflowY: 'auto', maxHeight: '140px'
                }}>
                  {stderr}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Floating AI Assistant */}
      <AIHintAssistant
        questionTitle={activeFile?.name || 'Cloud IDE Workspace'}
        questionContent="Standalone Cloud Compiler & File Explorer"
        questionLevel="All Levels"
        language={language}
        code={code}
        testCases={[]}
      />
    </div>
  );
};

export default FreeCompilerPage;
