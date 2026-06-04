import bcrypt from 'bcrypt';

const DEFAULT_ROUNDS = 12;

function getRounds(): number {
  const parsed = Number(process.env.BCRYPT_ROUNDS ?? DEFAULT_ROUNDS);
  return Number.isFinite(parsed) && parsed >= 10 ? parsed : DEFAULT_ROUNDS;
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, getRounds());
}

export async function verifyPassword(
  plain: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}
