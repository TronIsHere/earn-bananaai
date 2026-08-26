export const MAX_IMAGE_SIZE = 6 * 1024 * 1024;
export const MIN_IMAGE_SIZE = 1024;

export const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;

export const ALLOWED_IMAGE_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
] as const;

export const INVALID_IMAGE_FORMAT_ERROR =
  "فرمت فایل نامعتبر است. فقط JPG، PNG و WEBP مجاز است";

export const IMAGE_TOO_LARGE_ERROR =
  "حجم فایل بیش از ۶ مگابایت است. لطفاً عکس کوچکتری انتخاب کنید";

export const IMAGE_TOO_SMALL_ERROR = "فایل خیلی کوچک است";

export const HEIC_UPLOAD_ERROR =
  "فرمت HEIC پشتیبانی نمی‌شود. لطفاً عکس را به JPG تبدیل کنید و دوباره انتخاب کنید";

export function getImageFileExtension(fileName: string): string {
  return fileName.toLowerCase().substring(fileName.lastIndexOf("."));
}

export function isAllowedImageFile(file: File): boolean {
  const fileExtension = getImageFileExtension(file.name);
  const isImageByType =
    file.type.startsWith("image/") &&
    ALLOWED_IMAGE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_IMAGE_MIME_TYPES)[number]
    );
  const isImageByExtension = ALLOWED_IMAGE_EXTENSIONS.includes(
    fileExtension as (typeof ALLOWED_IMAGE_EXTENSIONS)[number]
  );

  return isImageByType || isImageByExtension;
}

export function isHeicFile(file: File): boolean {
  const fileExtension = getImageFileExtension(file.name);
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    file.type === "image/heic-sequence" ||
    file.type === "image/heif-sequence" ||
    fileExtension === ".heic" ||
    fileExtension === ".heif"
  );
}
