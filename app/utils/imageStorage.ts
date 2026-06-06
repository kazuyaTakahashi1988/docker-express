import * as fs from "fs/promises";
import * as path from "path";

const localUploadDir = path.join(process.cwd(), "public", "uploads");
const uploadPrefix = process.env.GCS_UPLOAD_PREFIX || "uploads";

const getBucketName = () => process.env.GCS_BUCKET_NAME || "";
const getNormalizedUploadPrefix = () => uploadPrefix.replace(/\/$/, "");
const getUploadsBaseUrl = () => {
  if (process.env.UPLOADS_BASE_URL) {
    return process.env.UPLOADS_BASE_URL.replace(/\/$/, "");
  }

  const bucketName = getBucketName();
  if (bucketName) {
    return `https://storage.googleapis.com/${bucketName}/${getNormalizedUploadPrefix()}`;
  }

  return "/uploads";
};
const isCloudStorageEnabled = () => Boolean(getBucketName());

const encodeObjectName = (objectName: string) =>
  objectName
    .split("/")
    .map((part) => encodeURIComponent(part))
    .join("/");

const getUploadObjectName = (fileName: string) => `${getNormalizedUploadPrefix()}/${fileName}`;

const getAccessToken = async () => {
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } },
  );

  if (!response.ok) {
    throw new Error(`Failed to get Google Cloud metadata token: ${response.status}`);
  }

  const tokenResponse = (await response.json()) as { access_token?: string };
  if (!tokenResponse.access_token) {
    throw new Error("Google Cloud metadata token response did not include access_token");
  }

  return tokenResponse.access_token;
};

export const createUploadMiddleware = (multer: {
  memoryStorage: () => unknown;
  default?: unknown;
}) => {
  const multerModule = multer as unknown as {
    memoryStorage: () => unknown;
    (options: unknown): { single(fieldName: string): unknown };
  };

  return multerModule({
    storage: multerModule.memoryStorage(),
    limits: { fileSize: Number(process.env.UPLOAD_MAX_BYTES || 5 * 1024 * 1024) },
  });
};

export const getStoredImageUrl = (fileName: string) => {
  const baseUrl = getUploadsBaseUrl();
  return `${baseUrl}/${encodeURIComponent(fileName)}`;
};

export const shouldRedirectStoredImageRequests = () => /^https?:\/\//.test(getUploadsBaseUrl());

export const saveImageBuffer = async (fileName: string, buffer: Buffer) => {
  if (!isCloudStorageEnabled()) {
    await fs.mkdir(localUploadDir, { recursive: true });
    await fs.writeFile(path.join(localUploadDir, fileName), buffer);
    return;
  }

  const bucketName = getBucketName();
  const objectName = getUploadObjectName(fileName);
  const accessToken = await getAccessToken();
  const uploadUrl = new URL(`https://storage.googleapis.com/upload/storage/v1/b/${bucketName}/o`);
  uploadUrl.searchParams.set("uploadType", "media");
  uploadUrl.searchParams.set("name", objectName);

  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "image/jpeg" },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Failed to upload ${objectName} to Cloud Storage: ${response.status} ${text}`);
  }
};

export const fetchStoredImage = async (fileName: string) => {
  if (!isCloudStorageEnabled()) {
    return undefined;
  }

  const bucketName = getBucketName();
  const objectName = getUploadObjectName(fileName);
  const accessToken = await getAccessToken();
  const downloadUrl = `https://storage.googleapis.com/storage/v1/b/${bucketName}/o/${encodeObjectName(objectName)}?alt=media`;
  const response = await fetch(downloadUrl, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Failed to download ${objectName} from Cloud Storage: ${response.status} ${text}`,
    );
  }

  const body = Buffer.from(await response.arrayBuffer());
  return { body, contentType: response.headers.get("content-type") || "image/jpeg" };
};
