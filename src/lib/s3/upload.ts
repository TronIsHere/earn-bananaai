import "server-only";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import { validateImageFile } from "@/lib/image-validation";
import { getImageFileExtension } from "@/lib/image-constants";
import { getPublicObjectUrl, getS3Bucket, getS3Client } from "./client";

const MIME_BY_EXTENSION: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function uploadProofScreenshot(
  file: File,
  userId: string
): Promise<{ url: string; key: string; fileName: string }> {
  const validation = validateImageFile(file);
  if (!validation.isValid) {
    throw new Error(validation.error || "Invalid file");
  }

  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = getImageFileExtension(file.name).replace(".", "") || "jpg";
  const safeExtension = MIME_BY_EXTENSION[extension] ? extension : "jpg";
  const fileName = `${timestamp}-${randomString}.${safeExtension}`;
  const key = `earn/proofs/${userId}/${fileName}`;

  let contentType = file.type;
  if (!contentType || contentType === "application/octet-stream") {
    contentType = MIME_BY_EXTENSION[safeExtension] || "image/jpeg";
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
      Body: buffer,
      ContentType: contentType,
    })
  );

  return { key, url: getPublicObjectUrl(key), fileName };
}
