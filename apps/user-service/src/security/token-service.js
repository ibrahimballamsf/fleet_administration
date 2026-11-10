import jwt from "jsonwebtoken";

export function createTokenService({ secret, expiresIn, issuer, audience }) {
  return Object.freeze({
    expiresIn,

    sign(user) {
      return jwt.sign(
        { role: user.role, email: user.email },
        secret,
        {
          algorithm: "HS256",
          subject: String(user.id ?? user._id),
          expiresIn,
          issuer,
          audience
        }
      );
    },

    verify(token) {
      return jwt.verify(token, secret, {
        algorithms: ["HS256"],
        issuer,
        audience
      });
    }
  });
}
