import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Manually parse .env
const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  // Let's do a select but we can also check what happens if it's empty
  const { data, error } = await supabase
    .from('student_submissions')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error("Error:", error);
  } else {
    console.log("Success! Submissions found:", data);
  }
}
checkSchema();
