import crypto from "crypto";
import { logger } from "./logger";

// AES-256-GCM for integration credentials at rest. Key is derived from
// CREDENTIALS_SECRET; without it we fall back to a dev-only key so local
// setups keep working, but production must set the secret.
const secret = process.env.CREDENTIALS_SECRET;
if (!secret && process.env.NODE_ENV === "production") {
  logger.warn("CREDENTIALS_SECRET is not set — integration credentials will use an insecure dev key");
}
const key = crypto.createHash("sha256").update(secret ?? "chiefmkt-dev-only-secret").digest();

export function encryptJson(value: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const plaintext = Buffer.from(JSON.stringify(value), "utf8");
  const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function decryptJson<T = Record<string, string>>(payload: string): T | null {
  try {
    const buf = Buffer.from(payload, "base64");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    const plaintext = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(plaintext.toString("utf8")) as T;
  } catch {
    return null;
  }
}
