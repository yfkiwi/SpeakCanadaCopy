import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xjgkbotfyusefstrottp.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqZ2tib3RmeXVzZWZzdHJvdHRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTAxMTk5ODEsImV4cCI6MjA2NTY5NTk4MX0.F9y7xhAOI257wbx3_hPnx2RK_NapmZfhosbrDmtHUHQ';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
