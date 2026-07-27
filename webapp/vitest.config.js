import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  // Next.js solo carga NEXT_PUBLIC_* en process.env dentro de `next dev`/`next build`.
  // Vitest no pasa por ahí, así que hay que cargar .env.local nosotros mismos para
  // que lib/supabaseClient.js encuentre las credenciales al testear.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ""));

  return {
    test: {
      environment: "node",
      include: ["lib/**/*.test.js"],
    },
  };
});
