import jwt from "jsonwebtoken";

export function createTokenVerifier({ secret, issuer, audience }) {
  return Object.freeze({
    verify(token) {
      return jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer,
        audience
      });
    }
  });
}
