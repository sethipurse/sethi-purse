import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://bbdatviaaiqpfvwumkkd.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'local-build-placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey);

export function readJson(filename, defaultContent = []) {
  return defaultContent;
}

export function writeJson(filename, data) {
  return true;
}

export function nowIST() {
  const d = new Date();
  const utcMs = d.getTime() + d.getTimezoneOffset() * 60000;
  const ist = new Date(utcMs + 5.5 * 3600 * 1000);
  const yyyy = ist.getFullYear();
  const mm = String(ist.getMonth() + 1).padStart(2, '0');
  const dd = String(ist.getDate()).padStart(2, '0');
  const hh = String(ist.getHours()).padStart(2, '0');
  const mi = String(ist.getMinutes()).padStart(2, '0');
  const ss = String(ist.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}+05:30`;
}
