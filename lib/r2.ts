import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

function env(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Falta la variable de entorno ${name}`);
  return v;
}

let client: S3Client | null = null;

export function r2Client(): S3Client {
  if (!client) {
    client = new S3Client({
      region: "auto",
      endpoint: env("R2_ENDPOINT"),
      credentials: {
        accessKeyId: env("R2_ACCESS_KEY_ID"),
        secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
      },
    });
  }
  return client;
}

export function bucket(): string {
  return env("R2_BUCKET");
}

// URL pública de un objeto (r2.dev o custom domain, sin barra final).
export function publicUrl(key: string): string {
  const base = env("R2_PUBLIC_URL").replace(/\/$/, "");
  return `${base}/${key.split("/").map(encodeURIComponent).join("/")}`;
}
