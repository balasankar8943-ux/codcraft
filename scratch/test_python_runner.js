// scratch/test_python_runner.js
const code = `import pandas as pd
import numpy as np
data = {'RollNo': [101, 102], 'Name': ['Ananya', 'Rahul'], 'CGPA': [9.4, 8.2]}
df = pd.DataFrame(data)
print("=== KTU STUDENT PERFORMANCE ===")
print(df)
print("\\nAverage CGPA:", df['CGPA'].mean())
`;

async function testPiston() {
  console.log("Testing Piston API...");
  try {
    const res = await fetch('https://emkc.org/api/v2/piston/execute', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        language: 'python',
        version: '3.10.0',
        files: [{ content: code }]
      })
    });
    const data = await res.json();
    console.log("Piston result:", JSON.stringify(data));
  } catch (err) {
    console.error("Piston failed:", err);
  }
}

async function testJudge0() {
  console.log("Testing Judge0 Extra CE...");
  try {
    const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        source_code: code,
        language_id: 71
      })
    });
    const data = await res.json();
    console.log("Judge0 71 result:", JSON.stringify(data));
  } catch (err) {
    console.error("Judge0 failed:", err);
  }
}

async function run() {
  await testPiston();
  await testJudge0();
}

run();
