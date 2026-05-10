import { supabase } from "@/integrations/supabase/client";

// Wraps a TanStack server function call so we attach the user's Supabase access
// token via the Authorization header. The auth middleware on the server reads
// this header to authenticate the request.
export async function callAuthed<TInput, TOutput>(
  fn: (opts: { data: TInput; headers?: Record<string, string> }) => Promise<TOutput>,
  data: TInput,
): Promise<TOutput> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;
  if (!token) throw new Error("You must be signed in");
  return fn({ data, headers: { Authorization: `Bearer ${token}` } });
}
