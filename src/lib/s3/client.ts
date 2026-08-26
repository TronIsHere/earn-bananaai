import "server-only";
import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function getHetznerS3Config() {
  const endpoint = trimTrailingSlash(requireEnv("HETZNER_S3_ENDPOINT"));
  const bucket = requireEnv("HETZNER_S3_BUCKET");
  const region = process.env.HETZNER_S3_REGION?.trim() || "nbg1";

  return {
    endpoint,
    bucket,
    region,
    accessKeyId: requireEnv("HETZNER_S3_ACCESS_KEY_ID"),
    secretAccessKey: requireEnv("HETZNER_S3_SECRET_ACCESS_KEY"),
  };
}

let client: S3Client | null = null;

export function getS3Client(): S3Client {
  if (client) return client;
  const config = getHetznerS3Config();
  client = new S3Client({
    endpoint: config.endpoint,
    region: config.region,
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    forcePathStyle: true,
  });
  return client;
}

export function getS3Bucket(): string {
  return getHetznerS3Config().bucket;
}

/** Virtual-hosted public URL used by Hetzner Object Storage. */
export function getPublicObjectUrl(key: string): string {
  const { endpoint, bucket } = getHetznerS3Config();
  const host = new URL(endpoint).host;
  const normalizedKey = key.replace(/^\/+/, "");
  return `https://${bucket}.${host}/${normalizedKey}`;
}

export function extractS3KeyFromUrl(url: string): string | null {
  try {
    const { endpoint, bucket } = getHetznerS3Config();
    const parsed = new URL(url);
    const endpointHost = new URL(endpoint).host.toLowerCase();
    const virtualHost = `${bucket}.${endpointHost}`.toLowerCase();
    const host = parsed.host.toLowerCase();
    const path = parsed.pathname.replace(/^\/+/, "");

    if (host === virtualHost) {
      return path || null;
    }

    if (host === endpointHost) {
      const prefix = `${bucket}/`;
      if (!path.startsWith(prefix)) return null;
      return path.slice(prefix.length) || null;
    }

    return null;
  } catch {
    return null;
  }
}

export function isOurProofObjectUrl(url: string, userId: string): boolean {
  const key = extractS3KeyFromUrl(url);
  if (!key) return false;
  return key.startsWith(`earn/proofs/${userId}/`);
}
