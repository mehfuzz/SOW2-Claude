import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || val.includes("your-project") || val.includes("your-")) {
    throw new Error(
      `Environment variable ${name} is missing or still a placeholder. ` +
      `Go to Vercel → Project → Settings → Environment Variables, set it, then redeploy.`
    );
  }
  return val;
}

// Public client (anon key) — lazy so build doesn't fail without env vars
export function getSupabase() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

// Admin client (service role key) — for server-side API routes only
export function supabaseAdmin() {
  return createClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY")
  );
}
