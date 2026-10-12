import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { configured, supabasePublicKey } from "@/lib/config";
export async function db() {
  if (!configured)
    throw new Error(
      "The service is not connected yet. Please try again after setup.",
    );
  const jar = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    supabasePublicKey!,
    {
      cookies: {
        getAll: () => jar.getAll(),
        setAll(values) {
          try {
            values.forEach(({ name, value, options }) =>
              jar.set(name, value, options),
            );
          } catch {
            /* Proxy refreshes cookies for Server Components. */
          }
        },
      },
    },
  );
}
