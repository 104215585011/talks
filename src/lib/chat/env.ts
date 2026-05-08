export function getMessageEncryptionSecret() {
  return process.env.MESSAGE_ENCRYPTION_KEY ?? process.env.JWT_SECRET ?? "local-development-key";
}
