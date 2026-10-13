import { compare, hash } from 'bcrypt';

const SALT_ROUNDS = 10;

export function hashPassword(password: string): Promise<string> {
  return hash(password, SALT_ROUNDS);
}

export function dehashPassword(
  password: string,
  hashedPassword: string,
): Promise<boolean> {
  return compare(password, hashedPassword);
}
