import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Los callbacks sensibles se procesan expresamente en su pagina.
      // Evita que una sesion ordinaria se confunda con una recuperacion.
      detectSessionInUrl: false,
    },
  }
);
