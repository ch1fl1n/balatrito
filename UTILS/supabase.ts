
// UTILS/supabase.ts
import 'react-native-url-polyfill/auto';   // polyfill necesario para RN
import Constants from 'expo-constants';
import { createClient } from '@supabase/supabase-js';

const extra = (Constants.expoConfig && (Constants.expoConfig.extra)) || (Constants.manifest && Constants.manifest.extra);
console.log('🔍 extra desde app.config.js:', extra);

const SUPABASE_URL = extra?.SUPABASE_URL ?? process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = extra?.SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

console.log('🔍 SUPABASE_URL:', SUPABASE_URL);

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('Supabase keys missing! Check app.config.js and .env');
}

export const supabase = createClient(SUPABASE_URL as string, SUPABASE_ANON_KEY as string);
