import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/auth";
import LoginForm from "./LoginForm";

// Gate optimista (reemplaza al viejo proxy.ts, que Next 16 en Cloudflare Workers
// no soporta): si ya hay sesión, no mostramos el login. La protección de /admin
// vive en admin/page.tsx (redirect a login) y la autorización real en
// requireAdmin() dentro de cada server action.
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await isAdmin()) redirect("/admin");
  return <LoginForm />;
}
