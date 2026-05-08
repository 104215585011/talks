import { compare, hash } from "@node-rs/bcrypt";

const BCRYPT_ROUNDS = 10;

export function hashPassword(password: string) {
  return hash(password, BCRYPT_ROUNDS);
}

export function verifyPassword(password: string, passwordHash: string) {
  return compare(password, passwordHash);
}
