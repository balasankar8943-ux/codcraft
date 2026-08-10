// src/components/FreeCompilerPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import {
  Play, Terminal, Code2, AlertCircle, Save, Folder, FolderPlus,
  FilePlus, Trash2, Edit3, ChevronRight, ChevronDown, FileCode, X, Loader2, Download,
  Copy, CheckCircle2, CornerDownLeft, Maximize2, Minimize2, HelpCircle,
  Scissors, ClipboardPaste, Send, RotateCcw
} from 'lucide-react';
import { useAuth } from './AuthProvider';
import AIHintAssistant from './AIHintAssistant';
import {
  fetchUserFiles, createFileItem, updateFileItem, deleteFileItem, inferLanguageFromName
} from '../services/fileService';
import type { FileItem } from '../services/fileService';

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,  // Python 3 with scientific libraries
  cpp: 54,     // C++ (GCC)
  c: 50,       // C (GCC)
  java: 62     // Java (OpenJDK)
};

const DEFAULT_TEMPLATES: Record<string, string> = {
  python: `# Free Interactive Python Playground\n# Pre-loaded with: NumPy, Pandas, SciPy, Math, and Standard Libraries\n\ndef main():\n    print("=== INTERACTIVE CALCULATOR ===")\n    op = input("Choose operation (1. Add, 2. Subtract, 3. Multiply): ")\n    num1 = float(input("Enter first number: "))\n    num2 = float(input("Enter second number: "))\n    \n    if op == '1':\n        print(f"Result: {num1} + {num2} = {num1 + num2}")\n    elif op == '2':\n        print(f"Result: {num1} - {num2} = {num1 - num2}")\n    elif op == '3':\n        print(f"Result: {num1} * {num2} = {num1 * num2}")\n    else:\n        print("Invalid operation selected.")\n\nif __name__ == "__main__":\n    main()\n`,
  numpy: `# NumPy & Linear Algebra Demo\nimport numpy as np\n\n# Create 2D Matrix\nA = np.array([[4, 2, 1],\n              [2, 5, 3],\n              [1, 3, 6]])\n\nB = np.array([10, 20, 30])\n\nprint("=== MATRIX OPERATIONS ===")\nprint("Matrix A:\\n", A)\nprint("\\nDeterminant of A:", round(np.linalg.det(A), 4))\nprint("Trace of A:", np.trace(A))\nprint("Inverse of A:\\n", np.linalg.inv(A))\n\n# Solve linear system Ax = B\nx = np.linalg.solve(A, B)\nprint("\\nSolution x for A·x = B:", x)\n`,
  pandas: `# Pandas Data Analysis Demo\nimport pandas as pd\nimport numpy as np\n\n# Sample Student Dataset\ndata = {\n    'RollNo': [101, 102, 103, 104, 105],\n    'Name': ['Ananya', 'Rahul', 'Sneha', 'Midhun', 'Diya'],\n    'Branch': ['CSE', 'ECE', 'CSE', 'EEE', 'IT'],\n    'CGPA': [9.4, 8.2, 9.1, 7.8, 8.9],\n    'Attendance_%': [95, 88, 92, 80, 96]\n}\n\ndf = pd.DataFrame(data)\n\nprint("=== KTU STUDENT PERFORMANCE ===")\nprint(df)\n\nprint("\\n=== SUMMARY STATISTICS ===")\nprint(f"Average CGPA: {df['CGPA'].mean():.2f}")\nprint(f"Top Performer:\\n{df.loc[df['CGPA'].idxmax()]}")\n`,
  cpp: `// Free Interactive C++ Playground\n#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    cout << "=== C++ INTERACTIVE CALCULATOR ===" << endl;\n    int choice;\n    cout << "Select operation (1. Add, 2. Multiply): ";\n    cin >> choice;\n    \n    double a, b;\n    cout << "Enter first number: ";\n    cin >> a;\n    cout << "Enter second number: ";\n    cin >> b;\n    \n    if (choice == 1) cout << "Result: " << a + b << endl;\n    else cout << "Result: " << a * b << endl;\n    return 0;\n}\n`,
  c: `/* Free Interactive C Playground */\n#include <stdio.h>\n\nint main() {\n    printf("=== C INTERACTIVE PROGRAM ===\\n");\n    int a, b;\n    printf("Enter first integer: ");\n    scanf("%d", &a);\n    printf("Enter second integer: ");\n    scanf("%d", &b);\n    printf("Sum: %d + %d = %d\\n", a, b, a + b);\n    return 0;\n}\n`,
  java: `// Free Interactive Java Playground\nimport java.util.Scanner;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        System.out.println("=== JAVA INTERACTIVE PROGRAM ===");\n        System.out.print("Enter your name: ");\n        String name = sc.nextLine();\n        System.out.print("Enter your age: ");\n        int age = sc.nextInt();\n        System.out.println("Hello " + name + "! Next year you will be " + (age + 1) + " years old.");\n    }\n}\n`
};

const FreeCompilerPage: React.FC = () => {
  const { user } = useAuth();
  const userId = user?.id || 'sandbox_user_id';

  // Screen width state for responsive view switching
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== 'undefined' && window.innerWidth <= 768);
  const [mobileTab, setMobileTab] = useState<'explorer' | 'editor' | 'console'>('editor');
  const [useNativeMobileEditor, setUseNativeMobileEditor] = useState<boolean>(false);

  // File tree states
  const [files, setFiles] = useState<FileItem[]>([]);
  const [openTabIds, setOpenTabIds] = useState<string[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Record<string, boolean>>({ folder_src: true });
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);

  // Modal / Dialog states
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);
  const [createType, setCreateType] = useState<'file' | 'folder'>('file');
  const [newItemName, setNewItemName] = useState<string>('');
  const [targetFolderId, setTargetFolderId] = useState<string | null>(null);
  const [showGuideModal, setShowGuideModal] = useState<boolean>(false);

  // Inline Rename state
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameInput, setRenameInput] = useState<string>('');

  // Code & Editor states
  const [code, setCode] = useState<string>('');
  const [language, setLanguage] = useState<string>('python');
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'dirty'>('saved');
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  // Execution & Real-Time Interactive Terminal states
  const [stdin, setStdin] = useState<string>('');
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [execTime, setExecTime] = useState<string | null>(null);
  const [consoleTab, setConsoleTab] = useState<'stdout' | 'stdin' | 'stderr'>('stdout');
  const [copied, setCopied] = useState<boolean>(false);
  const [isConsoleMaximized, setIsConsoleMaximized] = useState<boolean>(false);

  // Interactive Execution Queue states
  const [interactiveQueue, setInteractiveQueue] = useState<string[]>([]);
  const [liveInputVal, setLiveInputVal] = useState<string>('');
  const [isWaitingForInput, setIsWaitingForInput] = useState<boolean>(false);

  const editorRef = useRef<any>(null);
  const nativeTextareaRef = useRef<HTMLTextAreaElement>(null);
  const terminalBottomRef = useRef<HTMLDivElement>(null);

  // Track window resizing
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  // Auto-scroll terminal to bottom when stdout updates
  useEffect(() => {
    terminalBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [stdout, stderr, isWaitingForInput]);

  // Manual save trigger
  const handleManualSave = async () => {
    if (!activeFileId) return;
    setSaveStatus('saving');
    await updateFileItem(activeFileId, userId, { content: code, language });
    setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, content: code, language } : f));
    setSaveStatus('saved');
  };

  // Change active language
  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    if (activeFileId) {
      updateFileItem(activeFileId, userId, { language: newLang });
      setFiles(prev => prev.map(f => f.id === activeFileId ? { ...f, language: newLang } : f));
    }
  };

  // Download active open file directly to local device disk
  const handleDownloadFile = () => {
    const current = files.find(f => f.id === activeFileId);
    const fileName = current ? current.name : `code.${language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : 'java'}`;
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Clipboard Handlers: Copy, Cut, Paste
  const handleCopyCode = async () => {
    try {
      let textToCopy = code;
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection && !selection.isEmpty()) {
          textToCopy = editorRef.current.getModel().getValueInRange(selection);
        }
      } else if (nativeTextareaRef.current) {
        const start = nativeTextareaRef.current.selectionStart;
        const end = nativeTextareaRef.current.selectionEnd;
        if (start !== end) {
          textToCopy = code.substring(start, end);
        }
      }

      await navigator.clipboard.writeText(textToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      alert("Unable to access clipboard. Please use Ctrl+C / Cmd+C.");
    }
  };

  const handleCutCode = async () => {
    try {
      let textToCut = code;
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection && !selection.isEmpty()) {
          textToCut = editorRef.current.getModel().getValueInRange(selection);
          editorRef.current.executeEdits('cut', [{ range: selection, text: '' }]);
        } else {
          setCode('');
        }
      } else if (nativeTextareaRef.current) {
        const start = nativeTextareaRef.current.selectionStart;
        const end = nativeTextareaRef.current.selectionEnd;
        if (start !== end) {
          textToCut = code.substring(start, end);
          setCode(prev => prev.substring(0, start) + prev.substring(end));
        } else {
          setCode('');
        }
      }
      await navigator.clipboard.writeText(textToCut);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } catch (e) {
      alert("Unable to access clipboard. Please use Ctrl+X / Cmd+X.");
    }
  };

  const handlePasteCode = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (!text) return;

      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        if (selection) {
          editorRef.current.executeEdits('paste', [{ range: selection, text }]);
        } else {
          setCode(prev => prev + text);
        }
      } else {
        setCode(prev => prev + text);
      }
    } catch (e) {
      alert("Clipboard access permission denied by browser. Please press Ctrl+V (or Cmd+V) to paste directly into the editor.");
    }
  };

  // Open modal to create file or folder
  const openCreateModal = (type: 'file' | 'folder', parentFolderId: string | null = null) => {
    setCreateType(type);
    setNewItemName(type === 'file' ? 'script.py' : 'my_folder');
    setTargetFolderId(parentFolderId !== null ? parentFolderId : selectedFolderId);
    setShowCreateModal(true);
  };

  // Confirm creation of File or Folder
  const handleConfirmCreate = async () => {
    if (!newItemName.trim()) return;
    const name = newItemName.trim();
    const item = await createFileItem(
      userId,
      name,
      createType,
      targetFolderId,
      createType === 'file' ? (DEFAULT_TEMPLATES[inferLanguageFromName(name)] || '# Write your code here\n') : '',
      createType === 'file' ? inferLanguageFromName(name) : ''
    );

    setFiles(prev => [...prev, item]);
    setShowCreateModal(false);
    setNewItemName('');

    if (item.type === 'file') {
      setOpenTabIds(prev => prev.includes(item.id) ? prev : [...prev, item.id]);
      setActiveFileId(item.id);
      if (isMobile) setMobileTab('editor');
    } else {
      setExpandedFolderIds(prev => ({ ...prev, [item.id]: true }));
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
    if (isMobile) setMobileTab('editor');
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

  // Run Code via Judge0 API with Interactive Session support
  const executeCodeWithInputs = async (inputsList: string[]) => {
    if (!code) return;
    setIsRunning(true);
    setConsoleTab('stdout');
    if (isMobile) setMobileTab('console');
    const startTime = performance.now();

    try {
      const apiKey = (import.meta as any).env?.VITE_JUDGE0_API_KEY;
      const langId = LANGUAGE_IDS[language] || 71;
      let resOutput = { stdout: '', stderr: '' };

      const inputBuffer = inputsList.length > 0
        ? inputsList.join('\n') + '\n'
        : (stdin ? stdin : '');

      const body = JSON.stringify({ source_code: code, language_id: langId, stdin: inputBuffer });

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
          if (pubRes.ok) {
            const data = await pubRes.json();
            resOutput = { stdout: data.stdout || '', stderr: data.stderr || data.compile_output || '' };
          }
        }
      } else {
        const pubRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body
        });
        if (pubRes.ok) {
          const data = await pubRes.json();
          resOutput = { stdout: data.stdout || '', stderr: data.stderr || data.compile_output || '' };
        }
      }

      // Secondary High-Performance Piston Fallback for Scientific Libraries (NumPy, Pandas, SciPy)
      if (!resOutput.stdout && !resOutput.stderr) {
        try {
          const pistonLang = language === 'cpp' ? 'c++' : language;
          const pRes = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({
              language: pistonLang,
              version: '*',
              files: [{ content: code }],
              stdin: inputBuffer
            })
          });
          if (pRes.ok) {
            const pData = await pRes.json();
            if (pData.run) {
              resOutput = { stdout: pData.run.stdout || '', stderr: pData.run.stderr || '' };
            }
          }
        } catch (e) {}
      }

      const elapsed = ((performance.now() - startTime) / 1000).toFixed(2);
      setExecTime(`${elapsed}s`);
      
      const outText = resOutput.stdout || (resOutput.stderr ? '' : '(Program executed cleanly with no output)');
      const errText = resOutput.stderr || '';
      
      setStdout(outText);

      // Detect if program requires interactive user input (e.g. EOFError, input prompt ending without newline, or stdin exhaustion)
      const isEofWaiting = errText.includes('EOFError') || 
                           errText.includes('NoSuchElementException') || 
                           errText.includes('end of file') ||
                           (outText && !outText.endsWith('\n') && !errText);

      if (isEofWaiting) {
        setIsWaitingForInput(true);
        setConsoleTab('stdout'); // Always stay on Interactive Terminal so user can type!
        setStderr(''); // Don't show red error tab since program is waiting for input
      } else {
        setIsWaitingForInput(false);
        setStderr(errText);
        if (errText && !outText) {
          setConsoleTab('stderr');
        }
      }
    } catch (err: any) {
      setStderr(err?.message || 'Execution error. Check code syntax or network connection.');
      setConsoleTab('stderr');
    } finally {
      setIsRunning(false);
    }
  };

  // Trigger initial Run
  const handleRunCode = () => {
    setInteractiveQueue([]);
    setLiveInputVal('');
    executeCodeWithInputs([]);
  };

  // User submits a live input response directly inside the Interactive Terminal
  const handleSendLiveTerminalInput = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (liveInputVal === '' && !isWaitingForInput) return;

    const updatedQueue = [...interactiveQueue, liveInputVal];
    setInteractiveQueue(updatedQueue);
    setLiveInputVal('');
    setIsWaitingForInput(false);

    // Re-execute program with updated input queue
    executeCodeWithInputs(updatedQueue);
  };

  // Copy stdout content to clipboard
  const handleCopyConsoleOutput = () => {
    const textToCopy = consoleTab === 'stderr' ? stderr : stdout;
    if (!textToCopy) return;
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
              padding: '0.4rem 0.65rem', borderRadius: '6px', cursor: 'pointer',
              fontSize: '0.82rem', color: isActive ? 'var(--indigo)' : 'var(--text)',
              background: isActive ? 'var(--indigo-bg)' : isSelected ? 'var(--bg3)' : 'transparent',
              border: isActive ? '1px solid #c7d2fe' : '1px solid transparent',
              transition: 'all 0.15s', marginBottom: '2px'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', overflow: 'hidden', whiteSpace: 'nowrap' }}>
              {isFolder ? (
                <>
                  {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                  <Folder size={16} style={{ color: 'var(--gold)', flexShrink: 0 }} />
                </>
              ) : (
                <FileCode size={16} style={{ color: 'var(--indigo)', flexShrink: 0 }} />
              )}

              {renamingId === item.id ? (
                <input
                  type="text"
                  value={renameInput}
                  autoFocus
                  onChange={e => setRenameInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmRename(item.id)}
                  onBlur={() => handleConfirmRename(item.id)}
                  style={{ fontSize: '0.8rem', padding: '0.15rem 0.35rem', borderRadius: '4px', border: '1px solid var(--indigo)', outline: 'none' }}
                />
              ) : (
                <span style={{ fontWeight: isFolder ? 700 : 500 }}>{item.name}</span>
              )}
            </div>

            <div className="tree-action-btns" style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              {isFolder && (
                <button
                  title="Add file inside this folder"
                  onClick={e => { e.stopPropagation(); openCreateModal('file', item.id); }}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--indigo)', padding: '2px' }}
                >
                  <FilePlus size={14} />
                </button>
              )}
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
            <div style={{ borderLeft: '1.5px solid var(--border)', marginLeft: '0.75rem', marginTop: '2px' }}>
              {renderTreeNodes(item.id, depth + 1)}
            </div>
          )}
        </div>
      );
    });
  };

  const activeFile = files.find(f => f.id === activeFileId);
  const folders = files.filter(f => f.type === 'folder');

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
              
              <button
                onClick={() => setShowGuideModal(true)}
                style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: '20px', padding: '0.15rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, color: 'var(--indigo)', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
              >
                <HelpCircle size={13} /> How to Use?
              </button>
            </div>
            <p style={{ fontSize: '0.75rem', color: 'var(--muted)', margin: 0 }}>
              Create folders & files, save to database, compile code, and run interactive programs in real-time!
            </p>
          </div>
        </div>

        {/* Global IDE Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          <select
            value={language}
            onChange={e => handleLanguageChange(e.target.value)}
            className="select"
            style={{ padding: '0.4rem 0.8rem', fontSize: '0.82rem', fontWeight: 600, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}
          >
            <option value="python">🐍 Python 3 (NumPy/Pandas)</option>
            <option value="cpp">⚡ C++ (GCC)</option>
            <option value="c">⚙️ C (GCC)</option>
            <option value="java">☕ Java (OpenJDK)</option>
          </select>

          {/* Quick Snippet / Scientific Template Dropdown */}
          <select
            onChange={e => {
              if (e.target.value && DEFAULT_TEMPLATES[e.target.value]) {
                const templ = DEFAULT_TEMPLATES[e.target.value];
                setCode(templ);
                if (e.target.value === 'numpy' || e.target.value === 'pandas') {
                  setLanguage('python');
                } else if (DEFAULT_TEMPLATES[e.target.value]) {
                  setLanguage(e.target.value);
                }
              }
            }}
            defaultValue=""
            className="select"
            style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', fontWeight: 600, background: 'var(--bg2)', color: 'var(--indigo)', border: '1px solid #c7d2fe', borderRadius: 'var(--radius-sm)' }}
          >
            <option value="" disabled>📋 Load Snippet / Template...</option>
            <option value="python">🐍 Python: Interactive Calculator</option>
            <option value="numpy">🔢 Python: NumPy & Linear Algebra</option>
            <option value="pandas">📊 Python: Pandas Data Analysis</option>
            <option value="cpp">⚡ C++: Interactive Program</option>
            <option value="c">⚙️ C: Interactive Input</option>
            <option value="java">☕ Java: Interactive Scanner</option>
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
            onClick={handleDownloadFile}
            className="btn btn-outline btn-sm"
            title="Download this file to your computer/device"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <Download size={14} />
            <span>Download</span>
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="btn btn-primary btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontWeight: 800 }}
          >
            <Play size={14} />
            <span>{isRunning ? 'Running…' : 'Run Code (F5)'}</span>
          </button>
        </div>
      </div>

      {/* ── Smartphone Touch View Switcher Tabs (Only visible on Mobile screens) ── */}
      {isMobile && (
        <div style={{ display: 'flex', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', overflow: 'hidden' }}>
          <button
            onClick={() => setMobileTab('explorer')}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: mobileTab === 'explorer' ? 'var(--indigo-bg)' : 'transparent', color: mobileTab === 'explorer' ? 'var(--indigo)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
          >
            <Folder size={15} /> 📁 Explorer
          </button>
          <button
            onClick={() => setMobileTab('editor')}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: mobileTab === 'editor' ? 'var(--indigo-bg)' : 'transparent', color: mobileTab === 'editor' ? 'var(--indigo)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
          >
            <Code2 size={15} /> 💻 Code Editor
          </button>
          <button
            onClick={() => setMobileTab('console')}
            style={{ flex: 1, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 700, border: 'none', cursor: 'pointer', background: mobileTab === 'console' ? 'var(--indigo-bg)' : 'transparent', color: mobileTab === 'console' ? 'var(--indigo)' : 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem' }}
          >
            <Terminal size={15} /> 🖥️ Output
          </button>
        </div>
      )}

      {/* ── IDE Body Grid Layout (Desktop Side-by-Side / Mobile Responsive) ────── */}
      <div className="ide-body-grid">
        
        {/* ── Left Sidebar: File Explorer Tree ─────────────────── */}
        {(!isMobile || mobileTab === 'explorer') && !isConsoleMaximized && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '380px' }}>
            <div style={{ padding: '0.75rem 1rem', borderBottom: '1px solid var(--border)', background: 'var(--bg2)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--muted)' }}>
                📁 File Explorer
              </span>
              <div style={{ display: 'flex', gap: '0.4rem' }}>
                <button
                  title="Create New File"
                  onClick={() => openCreateModal('file')}
                  style={{ padding: '0.3rem 0.5rem', background: 'var(--indigo-bg)', border: '1px solid #c7d2fe', borderRadius: '4px', cursor: 'pointer', color: 'var(--indigo)', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <FilePlus size={14} /> + File
                </button>
                <button
                  title="Create New Folder"
                  onClick={() => openCreateModal('folder')}
                  style={{ padding: '0.3rem 0.5rem', background: 'var(--gold-bg)', border: '1px solid #fde68a', borderRadius: '4px', cursor: 'pointer', color: 'var(--gold)', fontSize: '0.72rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <FolderPlus size={14} /> + Folder
                </button>
              </div>
            </div>

            {/* File Tree List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '0.65rem' }}>
              {files.length === 0 ? (
                <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--muted)', fontSize: '0.8rem' }}>
                  No files created yet.<br />
                  Click <strong>+ File</strong> above to create your first code file!
                </div>
              ) : (
                renderTreeNodes(null, 0)
              )}
            </div>
          </div>
        )}

        {/* ── Middle Column: Tabs & Monaco Editor ─────────────── */}
        {(!isMobile || mobileTab === 'editor') && !isConsoleMaximized && (
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: '420px' }}>
            
            {/* File Tabs Bar & Clipboard Action Controls */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', background: '#18181b', overflowX: 'auto', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex' }}>
                {openTabIds.map(tId => {
                  const file = files.find(f => f.id === tId);
                  if (!file) return null;
                  const isActive = activeFileId === file.id;

                  return (
                    <div
                      key={file.id}
                      onClick={() => setActiveFileId(file.id)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.55rem 0.95rem',
                        fontSize: '0.8rem', fontWeight: isActive ? 700 : 500, cursor: 'pointer',
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

              {/* Cut / Copy / Paste Clipboard Toolbar Buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', paddingRight: '0.5rem', flexShrink: 0 }}>
                <button
                  onClick={handleCutCode}
                  title="Cut selection (or all code)"
                  style={{ background: '#27272a', border: 'none', color: '#e4e4e7', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <Scissors size={12} /> Cut
                </button>
                <button
                  onClick={handleCopyCode}
                  title="Copy selection (or all code)"
                  style={{ background: '#27272a', border: 'none', color: copiedCode ? '#4ade80' : '#e4e4e7', padding: '0.3rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  {copiedCode ? <CheckCircle2 size={12} /> : <Copy size={12} />}
                  <span>{copiedCode ? 'Copied ✓' : 'Copy'}</span>
                </button>
                <button
                  onClick={handlePasteCode}
                  title="Paste from clipboard into editor"
                  style={{ background: 'var(--indigo)', border: 'none', color: '#ffffff', padding: '0.3rem 0.55rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.72rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  <ClipboardPaste size={12} /> Paste
                </button>
              </div>
            </div>

            {/* Mobile Editor Mode Toggle (shown on small screens) */}
            {isMobile && (
              <div style={{ padding: '0.35rem 0.75rem', background: '#121215', borderBottom: '1px solid #27272a', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.72rem', color: '#a1a1aa' }}>
                  📱 Smartphone Keyboard Mode:
                </span>
                <button
                  onClick={() => setUseNativeMobileEditor(prev => !prev)}
                  style={{ background: useNativeMobileEditor ? 'var(--indigo)' : 'var(--bg3)', color: useNativeMobileEditor ? '#fff' : 'var(--text)', border: '1px solid var(--border)', borderRadius: '4px', padding: '0.2rem 0.5rem', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {useNativeMobileEditor ? '📱 Native Touch (Active)' : '⚡ Monaco Editor'}
                </button>
              </div>
            )}

            {/* Editor Container */}
            <div
              onClick={() => { if (editorRef.current) editorRef.current.focus(); }}
              onTouchStart={() => { if (editorRef.current) editorRef.current.focus(); }}
              style={{ flex: 1, position: 'relative', background: '#1e1e1e', minHeight: '380px', display: 'flex', flexDirection: 'column' }}
            >
              {isMobile && useNativeMobileEditor ? (
                <textarea
                  ref={nativeTextareaRef}
                  value={code}
                  onChange={e => setCode(e.target.value)}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  placeholder="// Type or paste your code here on mobile..."
                  style={{
                    flex: 1, width: '100%', minHeight: '380px', padding: '1rem', background: '#1e1e1e',
                    color: '#f4f4f5', fontFamily: '"JetBrains Mono", Consolas, monospace', fontSize: '0.9rem',
                    lineHeight: 1.6, border: 'none', outline: 'none', resize: 'none'
                  }}
                />
              ) : (
                <Editor
                  height="100%"
                  language={language === 'c' ? 'cpp' : language}
                  theme="vs-dark"
                  value={code}
                  onChange={v => setCode(v || '')}
                  onMount={(editor, monaco) => {
                    editorRef.current = editor;

                    // Override Monaco Right-Click Context Menu Cut Action
                    editor.addAction({
                      id: 'monaco-context-cut',
                      label: 'Cut (Clipboard API)',
                      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX],
                      contextMenuGroupId: '9_cutcopypaste',
                      contextMenuOrder: 1,
                      run: async (ed: any) => {
                        try {
                          const selection = ed.getSelection();
                          const selectedText = ed.getModel().getValueInRange(selection);
                          const textToCut = selectedText || ed.getValue();

                          await navigator.clipboard.writeText(textToCut);
                          if (selection && !selection.isEmpty()) {
                            ed.executeEdits('cut', [{ range: selection, text: '' }]);
                          } else {
                            ed.setValue('');
                          }
                        } catch (e) {
                          document.execCommand('cut');
                        }
                      }
                    });

                    // Override Monaco Right-Click Context Menu Copy Action
                    editor.addAction({
                      id: 'monaco-context-copy',
                      label: 'Copy (Clipboard API)',
                      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC],
                      contextMenuGroupId: '9_cutcopypaste',
                      contextMenuOrder: 2,
                      run: async (ed: any) => {
                        try {
                          const selection = ed.getSelection();
                          const selectedText = ed.getModel().getValueInRange(selection);
                          const textToCopy = selectedText || ed.getValue();

                          await navigator.clipboard.writeText(textToCopy);
                        } catch (e) {
                          document.execCommand('copy');
                        }
                      }
                    });

                    // Override Monaco Right-Click Context Menu Paste Action
                    editor.addAction({
                      id: 'monaco-context-paste',
                      label: 'Paste (Clipboard API)',
                      keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV],
                      contextMenuGroupId: '9_cutcopypaste',
                      contextMenuOrder: 3,
                      run: async (ed: any) => {
                        try {
                          const text = await navigator.clipboard.readText();
                          if (text) {
                            const selection = ed.getSelection();
                            if (selection) {
                              ed.executeEdits('paste', [{ range: selection, text }]);
                            } else {
                              ed.setValue(ed.getValue() + text);
                            }
                          }
                        } catch (e) {
                          alert("Browser blocked clipboard read permission. Press Ctrl+V (or Cmd+V) to paste directly into editor!");
                        }
                      }
                    });

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
                    wordWrap: 'on',
                    smoothScrolling: true,
                    renderLineHighlight: 'all',
                    bracketPairColorization: { enabled: true },
                    domReadOnly: false,
                    readOnly: false,
                    contextmenu: true,
                    selectOnLineNumbers: true,
                    copyWithSyntaxHighlighting: true,
                    fixedOverflowWidgets: true,
                    scrollBeyondLastLine: false
                  }}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Right Column: Clear & Dedicated Interactive Output Terminal Section ────────────── */}
        {(!isMobile || mobileTab === 'console' || isConsoleMaximized) && (
          <div style={{ background: '#09090b', border: '1px solid #27272a', borderRadius: 'var(--radius)', display: 'flex', flexDirection: 'column', overflow: 'hidden', boxShadow: '0 8px 24px rgba(0,0,0,0.3)', minHeight: '380px' }}>
            
            {/* Console Header Bar */}
            <div style={{ padding: '0.65rem 1rem', borderBottom: '1px solid #27272a', background: '#121215', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Terminal size={16} style={{ color: '#38bdf8' }} />
                <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#f4f4f5', letterSpacing: '0.04em' }}>
                  INTERACTIVE TERMINAL
                </span>
                
                {/* Execution Status Badge */}
                {isRunning ? (
                  <span style={{ fontSize: '0.68rem', background: '#f59e0b22', color: '#f59e0b', border: '1px solid #f59e0b55', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <Loader2 size={10} className="animate-spin" /> Running…
                  </span>
                ) : isWaitingForInput ? (
                  <span style={{ fontSize: '0.68rem', background: '#6366f122', color: '#818cf8', border: '1px solid #6366f155', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    ⌨️ Waiting for Input
                  </span>
                ) : stderr ? (
                  <span style={{ fontSize: '0.68rem', background: '#ef444422', color: '#ef4444', border: '1px solid #ef444455', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700 }}>
                    ❌ Error
                  </span>
                ) : stdout ? (
                  <span style={{ fontSize: '0.68rem', background: '#22c55e22', color: '#22c55e', border: '1px solid #22c55e55', padding: '0.15rem 0.5rem', borderRadius: '20px', fontWeight: 700 }}>
                    ✓ Finished
                  </span>
                ) : (
                  <span style={{ fontSize: '0.68rem', background: '#27272a', color: '#a1a1aa', padding: '0.15rem 0.5rem', borderRadius: '20px' }}>
                    ● Ready
                  </span>
                )}
              </div>

              {/* Header Right Controls */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                {execTime && (
                  <span style={{ fontSize: '0.72rem', color: '#4ade80', fontFamily: 'var(--mono)', fontWeight: 700 }}>
                    ⚡ {execTime}
                  </span>
                )}
                
                <button
                  title="Reset & Restart Program"
                  onClick={handleRunCode}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center' }}
                >
                  <RotateCcw size={14} />
                </button>

                <button
                  title="Copy Console Output"
                  onClick={handleCopyConsoleOutput}
                  style={{ background: 'none', border: 'none', color: copied ? '#4ade80' : '#a1a1aa', cursor: 'pointer', padding: '0.2rem', display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.7rem' }}
                >
                  {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                </button>

                <button
                  title="Clear Output Console"
                  onClick={() => { setStdout(''); setStderr(''); setExecTime(null); setInteractiveQueue([]); setIsWaitingForInput(false); }}
                  style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '0.2rem' }}
                >
                  <Trash2 size={14} />
                </button>

                {!isMobile && (
                  <button
                    title={isConsoleMaximized ? "Restore Layout" : "Maximize Console View"}
                    onClick={() => setIsConsoleMaximized(prev => !prev)}
                    style={{ background: 'none', border: 'none', color: '#a1a1aa', cursor: 'pointer', padding: '0.2rem' }}
                  >
                    {isConsoleMaximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                  </button>
                )}
              </div>
            </div>

            {/* Console Sub-Tabs Switcher */}
            <div style={{ display: 'flex', background: '#121215', borderBottom: '1px solid #27272a' }}>
              <button
                onClick={() => setConsoleTab('stdout')}
                style={{
                  flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', background: consoleTab === 'stdout' ? '#09090b' : 'transparent',
                  color: consoleTab === 'stdout' ? '#38bdf8' : '#71717a',
                  borderBottom: consoleTab === 'stdout' ? '2px solid #38bdf8' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                }}
              >
                <Terminal size={13} /> Interactive Terminal
              </button>
              <button
                onClick={() => setConsoleTab('stdin')}
                style={{
                  flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', background: consoleTab === 'stdin' ? '#09090b' : 'transparent',
                  color: consoleTab === 'stdin' ? '#fbbf24' : '#71717a',
                  borderBottom: consoleTab === 'stdin' ? '2px solid #fbbf24' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                }}
              >
                <CornerDownLeft size={13} /> Batch Stdin
              </button>
              <button
                onClick={() => setConsoleTab('stderr')}
                style={{
                  flex: 1, padding: '0.45rem 0.75rem', fontSize: '0.75rem', fontWeight: 700,
                  border: 'none', cursor: 'pointer', background: consoleTab === 'stderr' ? '#09090b' : 'transparent',
                  color: consoleTab === 'stderr' ? '#ef4444' : '#71717a',
                  borderBottom: consoleTab === 'stderr' ? '2px solid #ef4444' : '2px solid transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.3rem'
                }}
              >
                <AlertCircle size={13} /> Stderr {stderr && <span style={{ background: '#ef4444', color: '#fff', borderRadius: '50%', width: '14px', height: '14px', fontSize: '0.6rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>!</span>}
              </button>
            </div>

            {/* Console Tab Content Area */}
            <div style={{ flex: 1, padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.85rem', overflowY: 'auto' }}>
              
              {/* Interactive Terminal stdout view */}
              {consoleTab === 'stdout' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  
                  {/* Waiting for Input Notification Banner */}
                  {isWaitingForInput && (
                    <div style={{ padding: '0.55rem 0.85rem', background: '#1e1b4b', border: '1px solid #6366f1', borderRadius: '6px', color: '#c7d2fe', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.55rem' }}>
                      <span style={{ fontSize: '1.1rem' }}>⌨️</span>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, color: '#a5b4fc', fontSize: '0.8rem' }}>Input Required</div>
                        <div style={{ fontSize: '0.72rem', color: '#cbd5e1' }}>Your program is waiting for input (e.g. <code>input()</code> or <code>cin</code>). Enter a value below:</div>
                      </div>
                    </div>
                  )}

                  <div style={{
                    flex: 1, minHeight: '240px', padding: '0.85rem', background: '#000000', color: '#38bdf8',
                    borderRadius: '6px', border: '1px solid #1e293b', fontFamily: '"JetBrains Mono", Consolas, monospace',
                    fontSize: '0.82rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowY: 'auto', display: 'flex', flexDirection: 'column'
                  }}>
                    {/* Previous Interactive Inputs History */}
                    {interactiveQueue.map((inp, idx) => (
                      <div key={idx} style={{ color: '#4ade80', fontFamily: 'inherit', marginBottom: '0.2rem' }}>
                        <span style={{ color: '#818cf8', fontWeight: 700 }}>➜ </span>{inp}
                      </div>
                    ))}

                    <div>
                      {stdout || (isRunning ? '⚡ Executing interactive program...' : (isWaitingForInput ? '' : 'Click "Run Code" in top bar to start terminal session.'))}
                    </div>

                    {/* Sequential Input Prompts & Real-Time Input Line */}
                    {(isRunning || isWaitingForInput || interactiveQueue.length > 0) && (
                      <form onSubmit={handleSendLiveTerminalInput} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.65rem', background: '#111827', padding: '0.45rem 0.75rem', borderRadius: '6px', border: isWaitingForInput ? '1.5px solid #6366f1' : '1px solid #334155', boxShadow: isWaitingForInput ? '0 0 12px rgba(99,102,241,0.3)' : 'none' }}>
                        <span style={{ color: isWaitingForInput ? '#a5b4fc' : '#818cf8', fontWeight: 700, fontSize: '0.85rem' }}>➜</span>
                        <input
                          type="text"
                          value={liveInputVal}
                          onChange={e => setLiveInputVal(e.target.value)}
                          placeholder={isWaitingForInput ? "Type input value (e.g. 4) & press Enter..." : "Enter next input..."}
                          autoFocus
                          style={{ flex: 1, background: 'transparent', border: 'none', color: '#f4f4f5', fontFamily: 'inherit', fontSize: '0.85rem', outline: 'none' }}
                        />
                        <button type="submit" disabled={isRunning} className="btn btn-primary btn-xs" style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', padding: '0.3rem 0.65rem', fontWeight: 700 }}>
                          <Send size={12} /> Send Input
                        </button>
                      </form>
                    )}
                    <div ref={terminalBottomRef} />
                  </div>
                </div>
              )}

              {/* Batch stdin view */}
              {consoleTab === 'stdin' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#a1a1aa', lineHeight: 1.4 }}>
                    Pre-fill batch inputs for your program (one per line):
                  </span>
                  <textarea
                    rows={8}
                    placeholder={`Example inputs:\n1\n10\n20`}
                    value={stdin}
                    onChange={e => setStdin(e.target.value)}
                    style={{ width: '100%', flex: 1, padding: '0.75rem', fontSize: '0.82rem', fontFamily: 'var(--mono)', borderRadius: '6px', border: '1px solid #27272a', background: '#000000', color: '#f4f4f5', outline: 'none', resize: 'vertical' }}
                  />
                </div>
              )}

              {/* stderr view */}
              {consoleTab === 'stderr' && (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  {stderr ? (
                    <pre style={{
                      flex: 1, minHeight: '220px', padding: '0.85rem', background: '#2a0808', color: '#fca5a5',
                      borderRadius: '6px', border: '1px solid #7f1d1d', fontFamily: '"JetBrains Mono", Consolas, monospace',
                      fontSize: '0.8rem', lineHeight: 1.6, whiteSpace: 'pre-wrap', overflowY: 'auto'
                    }}>
                      {stderr}
                    </pre>
                  ) : (
                    <div style={{ padding: '2rem 1rem', textAlign: 'center', color: '#71717a', fontSize: '0.8rem' }}>
                      ✓ No compilation warnings reported!
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Create New File / Folder Modal ──────────────────────── */}
      {showCreateModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(3px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.5rem', width: '100%', maxWidth: '420px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                {createType === 'file' ? <FilePlus size={18} style={{ color: 'var(--indigo)' }} /> : <FolderPlus size={18} style={{ color: 'var(--gold)' }} />}
                Create New {createType === 'file' ? 'File' : 'Folder'}
              </h3>
              <button onClick={() => setShowCreateModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={18} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>
                  {createType === 'file' ? 'File Name (e.g. main.py, app.cpp, demo.java):' : 'Folder Name:'}
                </label>
                <input
                  type="text"
                  value={newItemName}
                  autoFocus
                  onChange={e => setNewItemName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleConfirmCreate()}
                  placeholder={createType === 'file' ? 'solution.py' : 'my_project'}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', fontSize: '0.85rem', borderRadius: 'var(--radius-sm)', border: '1.5px solid var(--border)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: '0.35rem' }}>
                  Location:
                </label>
                <select
                  value={targetFolderId || ''}
                  onChange={e => setTargetFolderId(e.target.value ? e.target.value : null)}
                  style={{ width: '100%', padding: '0.55rem 0.75rem', fontSize: '0.82rem', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)', background: 'var(--bg2)', color: 'var(--text)' }}
                >
                  <option value="">📁 Root Directory (Top Level)</option>
                  {folders.map(f => (
                    <option key={f.id} value={f.id}>📁 {f.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', marginTop: '0.5rem' }}>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowCreateModal(false)}>
                  Cancel
                </button>
                <button className="btn btn-primary btn-sm" onClick={handleConfirmCreate}>
                  Create {createType === 'file' ? 'File' : 'Folder'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Quick How-to-Use Guide Modal ──────────────────────────── */}
      {showGuideModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.75rem', width: '100%', maxWidth: '520px', boxShadow: 'var(--shadow-lg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.2rem', color: 'var(--text)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                💡 Quick Guide: How to Use Cloud IDE
              </h3>
              <button onClick={() => setShowGuideModal(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', fontSize: '0.85rem', lineHeight: 1.6, color: 'var(--text2)' }}>
              <div style={{ padding: '0.75rem', background: 'var(--indigo-bg)', borderRadius: '8px', border: '1px solid #c7d2fe' }}>
                <strong>1. 📁 Create Files & Folders:</strong> Click <strong>+ File</strong> or <strong>+ Folder</strong> in the Explorer sidebar. Type names like <code>main.py</code>, <code>app.cpp</code>, or <code>hello.java</code>.
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg3)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <strong>2. ✂️ Cut, Copy & Paste:</strong> Right-click inside the editor or use the top action buttons (<strong>Cut</strong>, <strong>Copy</strong>, <strong>Paste</strong>) or press <code>Ctrl+C</code> / <code>Ctrl+V</code> / <code>Ctrl+X</code> (Cmd on Mac)!
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--gold-bg)', borderRadius: '8px', border: '1px solid #fde68a' }}>
                <strong>3. ⌨️ Real-Time Interactive Terminal:</strong> Run programs with <code>input()</code>, <code>scanf</code>, or <code>cin</code>. The terminal waits for you to type inputs line-by-line in real-time!
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--success-bg)', borderRadius: '8px', border: '1px solid #a7f3d0' }}>
                <strong>4. ⬇️ Download to Your Device:</strong> Click <strong>Download File</strong> to save any code file directly onto your phone or computer hard drive.
              </div>

              <div style={{ padding: '0.75rem', background: 'var(--bg2)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                <strong>5. 📱 Mobile & Desktop Friendly:</strong> On smartphones, switch between <strong>📁 Files</strong>, <strong>💻 Editor</strong>, and <strong>🖥️ Output</strong> tabs for easy touch navigation!
              </div>
            </div>

            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <button className="btn btn-primary btn-sm" onClick={() => setShowGuideModal(false)}>
                Got it, let's code! 🚀
              </button>
            </div>
          </div>
        </div>
      )}

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
