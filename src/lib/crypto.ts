import argon2 from "argon2";
import crypto from "crypto";
import { env } from "./env";

/**
 * HASHING DE SENHAS (Argon2id)
 * PHC winner - Proteção contra GPU / ASIC brute force
 */
export async function hashPassword(password: string): Promise<string> {
  return await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536, // 64 MB RAM
    timeCost: 3,        // 3 iterações
    parallelism: 4,     // 4 threads
  });
}

export async function verifyPassword(hash: string, plainText: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, plainText);
  } catch {
    return false;
  }
}

/**
 * CRIPTOGRAFIA DE DADOS EM REPOUSO (AES-256-GCM)
 * Usado para criptografar dados sensíveis no banco (ex: IPs, tokens Discord)
 */
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12; // 96 bits recomendado para AES-GCM

export function encryptData(plainText: string): string {
  const key = Buffer.from(env.AES_ENCRYPTION_KEY.padEnd(32).substring(0, 32), "utf-8");
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, "utf-8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag().toString("hex");

  // Formato retornado: iv.authTag.encrypted
  return `${iv.toString("hex")}.${authTag}.${encrypted}`;
}

export function decryptData(cipherText: string): string {
  const parts = cipherText.split(".");
  if (parts.length !== 3) {
    throw new Error("Formato de texto cifrado inválido");
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = Buffer.from(env.AES_ENCRYPTION_KEY.padEnd(32).substring(0, 32), "utf-8");
  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, "hex", "utf-8");
  decrypted += decipher.final("utf-8");

  return decrypted;
}

/**
 * PUBLIC KEY DB & ASSINATURA DE REQUISIÇÕES (Ed25519 / RSA)
 * Valida se requisições do servidor Minecraft foram assinadas pela Chave Privada correspondente à Chave Pública salva no banco.
 */
export function verifySignature(
  data: string,
  signatureHex: string,
  publicKeyPem: string
): boolean {
  try {
    const verify = crypto.createVerify("SHA256");
    verify.update(data);
    verify.end();
    return verify.verify(publicKeyPem, Buffer.from(signatureHex, "hex"));
  } catch {
    return false;
  }
}
