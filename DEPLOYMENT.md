# Deployment & Infra

Todo (hosting + storage) vive bajo **la cuenta de Cloudflare de Félix** (el cliente).

## Hosting — Cloudflare Workers (OpenNext)

Corre en **Cloudflare Workers** vía el adapter **`@opennextjs/cloudflare`** (no es Vercel).
Se eligió Cloudflare para consolidar todo bajo la cuenta del cliente y que el billing sea suyo.

- Worker name: **`felix-portfolio`** (debe coincidir con `name` en `wrangler.jsonc`).
- Config: `wrangler.jsonc` + `open-next.config.ts`. `nodejs_compat` activado (lo necesitan `node:crypto`/`Buffer` de `lib/auth.ts` y el `@aws-sdk/client-s3`).
- Las fotos NO pasan por el Worker: se sirven directo desde R2 (`<img>` con `publicUrl()`, no `next/image`), así que el ancho de banda pesado no cuenta contra el hosting.

### Git integration (Workers Builds) — push-to-deploy

Conectado al repo de GitHub `felix-portfolio` (acceso solo a ese repo). Cada `git push` a `main` dispara build + deploy automático.

- **Production branch:** `main`
- **Build command:** `npx opennextjs-cloudflare build`  ← NO `next build` a secas: hay que correr el adapter para generar `.open-next/worker.js`
- **Deploy command:** `npx wrangler deploy`
- **Root directory:** (vacío)

### Variables de entorno

⚠️ **No las cargues como vars de texto plano en el dashboard**: un `wrangler deploy` (que dispara cada git push) las **pisa/borra**, porque wrangler toma `wrangler.jsonc` como fuente de verdad. Síntoma: el admin tira "Manifest ilegible" después de un deploy.

Esquema deploy-proof:

1. **3 no sensibles → versionadas en `wrangler.jsonc` (`vars`)**: `R2_ENDPOINT`, `R2_BUCKET`, `R2_PUBLIC_URL`. Viajan con cada deploy, no se pueden borrar.
2. **2 credenciales → SECRETS encriptados** (Settings → *Variables and Secrets* → Add → **Secret**, o `wrangler secret put`): `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. Los secrets encriptados **NO** los borra un deploy.
3. **Build-time** (opcional, para que la home prerenderee fotos reales en vez de placeholders): las mismas en Builds → *Build variables and secrets*. No urgente mientras no haya fotos reales.

En local las 5 viven en **`.dev.vars`** (gitignored), que usa `bun run preview`.

### Comandos locales

- `bun run preview` — build OpenNext + Worker local (correr esto antes de confiar en el CI).
- `bun run deploy` — build + deploy manual (sin pasar por git).

## Storage — Cloudflare R2 (misma cuenta de Félix)

- Bucket: **`website`**
- S3 endpoint: `https://152d4890e768677fe7e3f024595d7f91.r2.cloudflarestorage.com`
- Dominio público de las fotos: **`media.felixgomezroca.com`** (`R2_PUBLIC_URL`, sin barra final)
- Credenciales S3 (API Token R2, Object Read & Write): access key + secret en `.dev.vars` local y en los secrets del Worker. **No** commitear el secret.
- El manifest (`_meta/manifest.json`) vive DENTRO del bucket; las keys son relativas (`photos/<id>/...`), agnósticas del dominio.

> Cuenta anterior (deprecada): bucket `felix-portfolio` en el account `3cb673...`. Se migró a la cuenta del cliente el 2026-08.

## Auth / routing (quirk Next 16 + Cloudflare)

Next 16 renombró `middleware.ts` → `proxy.ts`, pero el adapter de Cloudflare **no bundlea `proxy.ts`** ([workers-sdk #13755](https://github.com/cloudflare/workers-sdk/issues/13755)). Por eso `proxy.ts` fue **eliminado** y el gate optimista se movió a:

- `app/admin/page.tsx` — redirige a `/admin/login` si no hay sesión.
- `app/admin/login/page.tsx` — server component; redirige a `/admin` si ya hay sesión (renderiza `LoginForm.tsx`).
- La autorización real sigue en `requireAdmin()` dentro de cada server action (el gate es solo UX).

## Pendientes

- [ ] **CORS** en el bucket `website` (método PUT para el dominio del admin + `http://localhost:3000`) — sin esto las subidas del admin fallan.
- [ ] **Custom domain** `media.felixgomezroca.com` conectado al bucket + Public access habilitado.
- [ ] **Migrar las fotos** del bucket viejo (`felix-portfolio`) al nuevo (`website`) — copy directo, el nuevo arranca vacío.
- [ ] **Custom domain del sitio** en el Worker (ej. `felixgomezroca.com`).
