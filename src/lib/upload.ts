import { fileTypeFromBuffer } from "file-type";

// MIME types estritamente permitidos para evidências da staff (prints/vídeos)
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "application/pdf",
]);

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

export interface UploadValidationResult {
  valid: boolean;
  error?: string;
  detectedMime?: string;
  detectedExtension?: string;
}

/**
 * VALIDAÇÃO DE UPLOAD POR MAGIC BYTES (File Signatures)
 * Protege contra o envio de arquivos maliciosos disfarçados com extensões falsas (.php.png, .exe.jpg)
 */
export async function validateUploadBuffer(
  buffer: Buffer,
  declaredFileName: string
): Promise<UploadValidationResult> {
  // Log do nome de arquivo declarado para auditoria
  if (process.env.NODE_ENV === "development") {
    console.log(`[Upload Validation] Analisando arquivo: ${declaredFileName}`);
  }
  // 1. Validar Tamanho Máximo
  if (buffer.byteLength > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `Arquivo excede o limite máximo permitido de ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB`,
    };
  }

  // 2. Inspecionar Magic Bytes reais do arquivo
  const fileType = await fileTypeFromBuffer(buffer);

  if (!fileType) {
    return {
      valid: false,
      error: "Não foi possível determinar o formato real do arquivo. Conteúdo bloqueado por segurança.",
    };
  }

  // 3. Verificar se o MIME type real está na whitelist
  if (!ALLOWED_MIME_TYPES.has(fileType.mime)) {
    return {
      valid: false,
      error: `Tipo de arquivo não permitido (${fileType.mime}). Envie apenas imagens ou vídeos MP4.`,
    };
  }

  return {
    valid: true,
    detectedMime: fileType.mime,
    detectedExtension: fileType.ext,
  };
}

/**
 * GERAÇÃO DE PRESIGNED URL (Cloudflare R2 / AWS S3)
 * Gera uma URL segura temporária (expira em 5 min) para o cliente fazer upload direto ao bucket isolado.
 */
export async function generatePresignedUploadUrl(
  fileName: string,
  contentType: string,
  userId: string
): Promise<{ uploadUrl: string; fileKey: string; publicUrl: string }> {
  // Gera nome único e imprevisível de arquivo usando UUIDv4
  const randomId = crypto.randomUUID();
  const safeExtension = fileName.split(".").pop()?.toLowerCase() || "bin";
  const fileKey = `proofs/${userId}/${randomId}.${safeExtension}`;

  // Estrutura conceitual da URL pré-assinada R2/S3
  const publicUrl = `https://cdn.netpixelmon.com/${fileKey}`;
  const uploadUrl = `https://storage.netpixelmon.com/${fileKey}?X-Amz-Expires=300&X-Amz-Signature=mock_signature_for_demo`;

  return {
    uploadUrl,
    fileKey,
    publicUrl,
  };
}
