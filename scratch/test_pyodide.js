// scratch/test_pyodide.js
async function testPyodide() {
  console.log("Testing Pyodide CDN fetch...");
  try {
    const res = await fetch("https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js");
    console.log("Pyodide CDN status:", res.status, "content length:", res.headers.get("content-length"));
  } catch (err) {
    console.error("Pyodide fetch failed:", err);
  }
}
testPyodide();
