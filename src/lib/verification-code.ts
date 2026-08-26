const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Bio text prefix. Keep this exact so admins can match it in Instagram. */
export const VERIFICATION_CODE_PREFIX = "سفیر بنانا ai";

function randomToken(length = 4): string {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

/** Example: سفیر بناناai - 4F7K */
export function generateVerificationCode(): string {
  return `${VERIFICATION_CODE_PREFIX} - ${randomToken()}`;
}
