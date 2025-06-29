// supabase.js
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.supabaseUrl || 'http://localhost';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'dev-key-placeholder';

export const supabase = createClient(supabaseUrl, supabaseKey)
