import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://nwdjkitfpgoepfnzjret.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im53ZGpraXRmcGdvZXBmbnpqcmV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA4OTQxMjUsImV4cCI6MjA5NjQ3MDEyNX0.C8YH5qySs_W0edJur5IrMgrtMqpHfSSZRFcdNqNyr8k';

console.log("Supabase URL:", supabaseUrl);
console.log("Supabase Key (truncated):", supabaseKey.substring(0, 20) + "...");

const supabase = createClient(supabaseUrl, supabaseKey);

async function testConnection() {
  console.log("\n1. Testing connection and select from student_profiles...");
  const { data: profiles, error: err1 } = await supabase
    .from('student_profiles')
    .select('*')
    .limit(1);
    
  if (err1) {
    console.error("Error selecting student_profiles:", err1);
  } else {
    console.log("Success! Profiles found:", profiles);
  }

  console.log("\n2. Testing connection and select from student_progress...");
  const { data: progress, error: err2 } = await supabase
    .from('student_progress')
    .select('*')
    .limit(1);
    
  if (err2) {
    console.error("Error selecting student_progress:", err2);
  } else {
    console.log("Success! Progress found:", progress);
  }

  console.log("\n3. Testing RPC call get_codcraft_leaderboard...");
  const { data: leaderboard, error: err3 } = await supabase
    .rpc('get_codcraft_leaderboard', { result_limit: 10 });
    
  if (err3) {
    console.error("Error invoking RPC get_codcraft_leaderboard:", err3);
  } else {
    console.log("Success! Leaderboard data:", leaderboard);
  }
}

testConnection();
