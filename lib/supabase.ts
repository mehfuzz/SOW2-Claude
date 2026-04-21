import { createClient } from "@supabase/supabase-js";

function requireEnv(name: string): string {
  const val = process.env[name];
  if (!val || val.includes("your-project") || val.includes("your-")) {
    throw new Error(
      `Environment variable ${name} is missing or still set to a placeholder value. ` +
      `Go to Vercel → Project → Settings → Environment Variables and set it, then redeploy.`
    );
  }
  return val;
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""
);

export const supabaseAdmin = () => {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("SUPABASE_SERVICE_ROLE_KEY");
  return createClient(url, key);
};
