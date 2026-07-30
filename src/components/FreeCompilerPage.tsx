// src/components/FreeCompilerPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { Play, RotateCcw, Terminal, Code2, AlertCircle } from 'lucide-react';
import AIHintAssistant from './AIHintAssistant';

const DEFAULT_TEMPLATES: Record<string, string> = {
  python: `# Free Python 3 Playground
def main():
    name = input("Enter your name: ") if False else "Student"
    print(f"Hello, {name}! Welcome to CodCraft Free Compiler.")
    
    # Practice logic here
    numbers = [5, 2, 9, 1, 7]
    numbers.sort()
    print("Sorted numbers:", numbers)

if __name__ == "__main__":
    main()
`,
  cpp: `// Free C++ Playground
#include <iostream>
#include <vector>
#include <algorithm>

using namespace std;

int main() {
    cout << "Hello from CodCraft C++ Compiler!" << endl;
    
    vector<int> nums = {5, 2, 9, 1, 7};
    sort(nums.begin(), nums.end());
    
    cout << "Sorted vector: ";
    for (int n : nums) cout << n << " ";
    cout << endl;
    
    return 0;
}
`,
  c: `/* Free C Playground */
#include <stdio.h>

int main() {
    printf("Hello from CodCraft C Compiler!\\n");
    
    int a = 10, b = 25;
    printf("Sum of %d and %d is %d\\n", a, b, a + b);
    
    return 0;
}
`,
  java: `// Free Java Playground
import java.util.*;

public class Main {
    public static void main(String[] args) {
        System.out.println("Hello from CodCraft Java Compiler!");
        
        List<Integer> list = Arrays.asList(5, 2, 9, 1, 7);
        Collections.sort(list);
        
        System.out.println("Sorted list: " + list);
    }
}
`
};

const LANGUAGE_IDS: Record<string, number> = {
  python: 71,
  cpp: 54,
  c: 50,
  java: 62
};

const FreeCompilerPage: React.FC = () => {
  const [language, setLanguage] = useState<string>('python');
  const [code, setCode] = useState<string>('');
  const [stdin, setStdin] = useState<string>('');
  const [stdout, setStdout] = useState<string>('');
  const [stderr, setStderr] = useState<string>('');
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [execTime, setExecTime] = useState<string | null>(null);
  const editorRef = useRef<any>(null);

  // Restore saved code draft or default template
  useEffect(() => {
    const savedKey = `codcraft_compiler_${language}`;
    const saved = localStorage.getItem(savedKey);
    setCode(saved ?? DEFAULT_TEMPLATES[language] ?? '');
    setStdout('');
    setStderr('');
    setExecTime(null);
  }, [language]);

  // Persist code draft
  useEffect(() => {
    if (!code) return;
    const savedKey = `codcraft_compiler_${language}`;
    const t = setTimeout(() => localStorage.setItem(savedKey, code), 600);
    return () => clearTimeout(t);
  }, [code, language]);

  const handleRunCode = async () => {
    setIsRunning(true);
    setStdout('');
    setStderr('');
    setExecTime(null);
    const startTime = performance.now();

    try {
      const apiKey = (import.meta as any).env?.VITE_JUDGE0_API_KEY;
      const langId = LANGUAGE_IDS[language] || 71;

      let resOutput = { stdout: '', stderr: '' };

      if (apiKey) {
        const response = await fetch('https://judge0-ce.p.rapidapi.com/submissions?base64_encoded=false&wait=true', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'x-rapidapi-host': 'judge0-ce.p.rapidapi.com',
            'x-rapidapi-key': apiKey
          },
          body: JSON.stringify({
            source_code: code,
            language_id: langId,
            stdin: stdin
          })
        });

        if (response.ok) {
          const data = await response.json();
          resOutput = {
            stdout: data.stdout || '',
            stderr: data.stderr || data.compile_output || data.message || ''
          };
        } else {
          // Fallback to public Judge0 server
          const pubRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ source_code: code, language_id: langId, stdin: stdin })
          });
          const data = await pubRes.json();
          resOutput = { stdout: data.stdout || '', stderr: data.stderr || data.compile_output || '' };
        }
      } else {
        // Public Judge0 execution
        const pubRes = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ source_code: code, language_id: langId, stdin: stdin })
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

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      
      {/* Top Header */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(79, 70, 229, 0.1) 0%, rgba(147, 51, 234, 0.08) 100%)',
        border: '1px solid #c7d2fe', borderRadius: 'var(--radius-lg)', padding: '1.25rem 1.5rem',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
          <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: 'var(--indigo-bg)', color: 'var(--indigo)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Code2 size={24} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 900, color: 'var(--text)', margin: 0 }}>
                Free Practice Compiler
              </h1>
              <span className="badge badge-indigo" style={{ fontSize: '0.62rem' }}>AI Powered 🤖</span>
            </div>
            <p style={{ fontSize: '0.78rem', color: 'var(--muted)', margin: 0, marginTop: '0.15rem' }}>
              Write, run, and experiment with code freely in Python, C++, C, or Java with real-time AI assistance!
            </p>
          </div>
        </div>

        {/* Language & Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <button
            onClick={() => {
              if (confirm("Reset editor to default template?")) {
                const def = DEFAULT_TEMPLATES[language] || '';
                setCode(def);
                localStorage.removeItem(`codcraft_compiler_${language}`);
              }
            }}
            className="btn btn-outline btn-sm"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
          >
            <RotateCcw size={12} /> Reset Template
          </button>

          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            className="select"
            style={{ padding: '0.45rem 0.85rem', fontSize: '0.82rem', borderRadius: '8px', background: 'var(--card)', color: 'var(--text)', border: '1px solid var(--border)', fontWeight: 700 }}
          >
            <option value="python">Python 3</option>
            <option value="cpp">C++ (GCC)</option>
            <option value="c">C (GCC)</option>
            <option value="java">Java (OpenJDK)</option>
          </select>

          <button
            onClick={handleRunCode}
            disabled={isRunning}
            className="btn btn-primary"
            style={{ padding: '0.45rem 1.25rem', display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontWeight: 800 }}
          >
            <Play size={14} /> {isRunning ? 'Running...' : 'Run Code'}
          </button>
        </div>
      </div>

      {/* Main Split Layout: Editor on Left, Console Output & Custom Input on Right */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: '1.25rem', height: '620px' }}>
        
        {/* Left: Code Editor Container */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '1px solid var(--border)' }}>
          <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', fontFamily: 'var(--mono)' }}>
              main.{language === 'python' ? 'py' : language === 'cpp' ? 'cpp' : language === 'c' ? 'c' : 'java'}
            </span>
            <span style={{ fontSize: '0.7rem', color: 'var(--muted)' }}>Monaco Editor</span>
          </div>

          <div 
            style={{ flex: 1, overflow: 'hidden', cursor: 'text', position: 'relative' }}
            onClick={() => { if (editorRef.current) editorRef.current.focus(); }}
          >
            <Editor
              height="100%"
              language={language === 'cpp' || language === 'c' ? 'cpp' : language}
              theme="vs-dark"
              value={code}
              onChange={v => setCode(v || '')}
              onMount={(editor) => {
                editorRef.current = editor;
                setTimeout(() => editor.layout(), 100);
              }}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                fontFamily: '"JetBrains Mono", Consolas, monospace',
                automaticLayout: true,
                tabSize: 4,
                padding: { top: 16, bottom: 16 },
                wordWrap: 'on',
                lineNumbersMinChars: 3
              }}
            />
          </div>
        </div>

        {/* Right: Custom Input & Execution Console */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
          
          {/* Custom Input Pane */}
          <div className="card card-p-sm" style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', border: '1px solid var(--border)' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Terminal size={13} /> Custom Stdin (Input)
            </label>
            <textarea
              value={stdin}
              onChange={e => setStdin(e.target.value)}
              placeholder="Enter standard input values for your program..."
              rows={3}
              style={{
                width: '100%', padding: '0.5rem 0.75rem', background: 'var(--bg)',
                border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
                fontSize: '0.78rem', fontFamily: 'var(--mono)', color: 'var(--text)', resize: 'vertical'
              }}
            />
          </div>

          {/* Console Output Pane */}
          <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', padding: 0, border: '1px solid var(--border)' }}>
            <div style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)', padding: '0.6rem 1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text2)', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Terminal size={13} /> Program Output (Stdout & Stderr)
              </span>
              {execTime && (
                <span className="badge badge-green" style={{ fontSize: '0.6rem' }}>
                  ⚡ Done in {execTime}
                </span>
              )}
            </div>

            <div style={{ flex: 1, padding: '1rem', background: '#0f172a', color: '#f8fafc', fontFamily: 'var(--mono)', fontSize: '0.8rem', overflowY: 'auto', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>
              {isRunning ? (
                <div style={{ color: 'var(--gold)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span className="animate-spin">⟳</span> Compiling and executing code...
                </div>
              ) : stderr ? (
                <div>
                  <div style={{ color: '#ef4444', fontWeight: 700, marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <AlertCircle size={14} /> Compilation / Runtime Stderr:
                  </div>
                  <pre style={{ color: '#fca5a5', margin: 0 }}>{stderr}</pre>
                </div>
              ) : stdout ? (
                <div>
                  <pre style={{ margin: 0, color: '#38bdf8' }}>{stdout}</pre>
                </div>
              ) : (
                <div style={{ color: '#64748b', fontSize: '0.78rem' }}>
                  Press <strong>Run Code</strong> above to see console output.
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* Floating AI Coding Assistant */}
      <AIHintAssistant
        questionTitle="Free Practice Compiler"
        questionContent="Free coding arena for students to experiment with custom algorithms and practice code in Python, C++, C, or Java."
        questionLevel="Practice Arena"
        language={language}
        code={code}
        testCases={[{ input: stdin || 'None', output: 'Custom Execution' }]}
      />

    </div>
  );
};

export default FreeCompilerPage;
