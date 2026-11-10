import { expect } from "chai";
import { createUserService } from "../../src/services/user-service.js";

async function rejected(promise) {
  try { await promise; } catch (error) { return error; }
  throw new Error("Expected promise to reject");
}

function makeService(overrides = {}) {
  const calls = { created: [], updated: [] };
  const repository = {
    findByEmail: async () => null,
    create: async (input) => { calls.created.push(input); return { _id: "user-1", ...input }; },
    findById: async () => null,
    list: async () => ({ users: [], totalItems: 0 }),
    updateById: async (id, changes) => { calls.updated.push({ id, changes }); return { _id: id, ...changes }; },
    ...overrides.repository
  };
  const passwordHasher = {
    hash: async (password) => `hashed:${password}`,
    compare: async (password, hash) => hash === `hashed:${password}`,
    ...overrides.passwordHasher
  };
  const tokenService = {
    expiresIn: "1h",
    sign: (user) => `token:${user.id}`,
    ...overrides.tokenService
  };
  return { service: createUserService({ repository, passwordHasher, tokenService }), calls };
}

describe("User Service unit tests", () => {
  it("registers every public account as a viewer and never exposes its password hash", async () => {
    const { service, calls } = makeService();
    const user = await service.register({ name: "Amina", email: "amina@example.com", password: "strongpass", role: "admin" });

    expect(calls.created[0]).to.include({ email: "amina@example.com", role: "viewer", passwordHash: "hashed:strongpass" });
    expect(user).to.include({ id: "user-1", role: "viewer" });
    expect(user).not.to.have.property("passwordHash");
  });

  it("rejects duplicate email registration before hashing or persistence", async () => {
    let hashCalled = false;
    const { service } = makeService({
      repository: { findByEmail: async () => ({ id: "existing" }) },
      passwordHasher: { hash: async () => { hashCalled = true; } }
    });

    const error = await rejected(service.register({ name: "Amina", email: "used@example.com", password: "strongpass" }));
    expect(error.code).to.equal("CONFLICT");
    expect(hashCalled).to.equal(false);
  });

  it("creates a safe login session only for an active user with a valid password", async () => {
    const { service } = makeService({
      repository: { findByEmail: async () => ({ _id: "user-2", email: "driver@example.com", role: "viewer", isActive: true, passwordHash: "hashed:secret123" }) }
    });

    const session = await service.login({ email: "driver@example.com", password: "secret123" });
    expect(session).to.include({ token: "token:user-2", tokenType: "Bearer", expiresIn: "1h" });
    expect(session.user).not.to.have.property("passwordHash");
  });

  it("builds repository filters and pagination metadata for user listings", async () => {
    let received;
    const { service } = makeService({ repository: { list: async (input) => { received = input; return { users: [{ _id: "u1", role: "admin" }], totalItems: 21 }; } } });

    const result = await service.list({ page: 2, pageSize: 10, role: "admin", isActive: true });
    expect(received).to.deep.equal({ filter: { role: "admin", isActive: true }, page: 2, pageSize: 10 });
    expect(result.meta.pagination).to.include({ page: 2, pageSize: 10, totalItems: 21, totalPages: 3 });
  });
});
