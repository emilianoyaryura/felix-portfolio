import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Config mínima que deploya. El caché incremental (ISR / unstable_cache /
// revalidateTag) NO está persistido entre isolates todavía: para eso hay que
// habilitar el R2 incremental cache — ver el binding comentado en wrangler.jsonc
// y luego:
//   import r2IncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/r2-incremental-cache";
//   export default defineCloudflareConfig({ incrementalCache: r2IncrementalCache });
export default defineCloudflareConfig();
