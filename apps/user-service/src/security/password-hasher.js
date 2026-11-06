import bcrypt from "bcrypt";

export function createPasswordHasher(rounds) {
  return Object.freeze({
    hash(password) {
      return bcrypt.hash(password, rounds);
    },
    compare(password, passwordHash) {
      return bcrypt.compare(password, passwordHash);
    }
  });
}
