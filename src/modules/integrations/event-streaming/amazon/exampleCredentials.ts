// Example AWS-style credentials for input placeholders. Generated at runtime so
// no key-shaped literals live in the source tree (which secret scanners flag).

const ACCESS_KEY_ID_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const SECRET_KEY_CHARS =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

const randomString = (length: number, charset: string): string => {
  let result = "";
  for (let i = 0; i < length; i++) {
    result += charset[Math.floor(Math.random() * charset.length)];
  }
  return result;
};

/**
 * Generates an example AWS Access Key ID for use as an input placeholder.
 */
export const exampleAwsAccessKeyId = (): string =>
  "AKIA" + randomString(16, ACCESS_KEY_ID_CHARS);

/**
 * Generates an example AWS Secret Access Key for use as an input placeholder.
 */
export const exampleAwsSecretAccessKey = (): string =>
  randomString(40, SECRET_KEY_CHARS);
