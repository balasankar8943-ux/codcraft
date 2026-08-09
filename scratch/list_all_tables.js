import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// Parse .env
const envText = fs.readFileSync('.env', 'utf-8');
const env = {};
envText.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY);

async function listTables() {
  // Query all tables from postgres schema using RPC if available, or information schema select
  const { data, error } = await supabase
    .from('student_profiles')
    .select('*')
    .limit(1);
    
  console.log("student_profiles columns:", data ? Object.keys(data[0] || {}) : error);

  const { data: prog } = await supabase
    .from('student_progress')
    .select('*')
    .limit(1);
  console.log("student_progress columns:", prog ? Object.keys(prog[0] || {}) : "error");

  const { data: subs } = await supabase
    .from('student_submissions')
    .select('*')
    .limit(1);
  console.log("student_submissions columns:", subs ? Object.keys(subs[0] || {}) : "error");
}
listTables();
