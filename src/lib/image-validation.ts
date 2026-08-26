import {
  HEIC_UPLOAD_ERROR,
  IMAGE_TOO_LARGE_ERROR,
  IMAGE_TOO_SMALL_ERROR,
  INVALID_IMAGE_FORMAT_ERROR,
  MAX_IMAGE_SIZE,
  MIN_IMAGE_SIZE,
  isAllowedImageFile,
  isHeicFile,
} from "./image-constants";

export interface ImageValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { isValid: false, error: "فایلی انتخاب نشده است" };
  }

  if (isHeicFile(file)) {
    return { isValid: false, error: HEIC_UPLOAD_ERROR };
  }

  if (!isAllowedImageFile(file)) {
    return { isValid: false, error: INVALID_IMAGE_FORMAT_ERROR };
  }

  if (file.size > MAX_IMAGE_SIZE) {
    return { isValid: false, error: IMAGE_TOO_LARGE_ERROR };
  }

  if (file.size < MIN_IMAGE_SIZE) {
    return { isValid: false, error: IMAGE_TOO_SMALL_ERROR };
  }

  return { isValid: true };
}
