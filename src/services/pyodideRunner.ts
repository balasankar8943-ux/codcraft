// src/services/pyodideRunner.ts
// In-Browser WebAssembly Python Engine with full support for NumPy, Pandas, SciPy, Matplotlib, SymPy, and Math.

declare global {
  interface Window {
    loadPyodide?: (config?: { indexURL?: string }) => Promise<any>;
    _pyodideInstance?: any;
    _pyodideLoadingPromise?: Promise<any>;
  }
}

const PYODIDE_CDN_URL = 'https://cdn.jsdelivr.net/pyodide/v0.26.4/full/';

/**
 * Load Pyodide script tag into the DOM once and initialize the runtime.
 */
export async function getPyodideInstance(): Promise<any> {
  if (typeof window === 'undefined') return null;

  if (window._pyodideInstance) {
    return window._pyodideInstance;
  }

  if (window._pyodideLoadingPromise) {
    return window._pyodideLoadingPromise;
  }

  window._pyodideLoadingPromise = new Promise(async (resolve, reject) => {
    try {
      // Check if pyodide.js script is already loaded
      if (!window.loadPyodide) {
        await new Promise((res, rej) => {
          const script = document.createElement('script');
          script.src = `${PYODIDE_CDN_URL}pyodide.js`;
          script.async = true;
          script.onload = () => res(true);
          script.onerror = () => rej(new Error('Failed to load Pyodide WebAssembly script from CDN'));
          document.head.appendChild(script);
        });
      }

      if (!window.loadPyodide) {
        throw new Error('Pyodide loader unavailable');
      }

      const pyodide = await window.loadPyodide({
        indexURL: PYODIDE_CDN_URL
      });

      window._pyodideInstance = pyodide;
      resolve(pyodide);
    } catch (err) {
      window._pyodideLoadingPromise = undefined;
      reject(err);
    }
  });

  return window._pyodideLoadingPromise;
}

export interface PyodideRunResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

/**
 * Executes Python code in-browser via WebAssembly, automatically downloading required packages (numpy, pandas, etc.)
 */
export async function runPythonWithPyodide(
  sourceCode: string,
  stdinInput: string = '',
  onProgress?: (statusMsg: string) => void
): Promise<PyodideRunResult> {
  try {
    if (onProgress) onProgress('Initializing Python 3.12 WebAssembly Kernel…');
    const pyodide = await getPyodideInstance();

    if (onProgress) onProgress('Analyzing imports & pre-loading libraries (NumPy, Pandas, SciPy)…');
    // Automatically load packages required by imports (e.g. pandas, numpy, scipy, matplotlib)
    await pyodide.loadPackagesFromImports(sourceCode);

    // Setup stdout, stderr, and stdin redirection
    let stdoutBuffer = '';
    let stderrBuffer = '';

    pyodide.setStdout({
      batched: (text: string) => {
        stdoutBuffer += text + '\n';
      }
    });

    pyodide.setStderr({
      batched: (text: string) => {
        stderrBuffer += text + '\n';
      }
    });

    // Provide stdin simulation if input is provided
    if (stdinInput) {
      pyodide.setStdin({
        stdin: () => {
          // If custom stdin buffer is available
          return stdinInput;
        }
      });
    }

    if (onProgress) onProgress('Executing Python code…');
    await pyodide.runPythonAsync(sourceCode);

    return {
      stdout: stdoutBuffer.trimEnd(),
      stderr: stderrBuffer.trimEnd(),
      success: true
    };
  } catch (err: any) {
    const errMsg = err?.message || String(err);
    return {
      stdout: '',
      stderr: errMsg,
      success: false
    };
  }
}
