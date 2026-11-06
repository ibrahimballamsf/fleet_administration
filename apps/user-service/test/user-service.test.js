import assert from "node:assert/strict";
import test from "node:test";
import mongoose from "mongoose";
import request from "supertest";
import { createUserApplication } from "../src/app.js";
import { createPasswordHasher } from "../src/security/password-hasher.js";
import { createTokenService } from "../src/security/token-service.js";
import { createUserService } from "../src/services/user-service.js";

function createMemoryRepository() {
  const users = new Map();

  return {
    users,
    async create(values) {
      const now = new Date();
      const user = {
        id: new mongoose.Types.ObjectId().toString(),
        ...values,
        notificationPreferences: { criticalEvents: true, statusChanges: true },
        isActive: true,
        createdAt: now,
        updatedAt: now
      };
      users.set(user.id, user);
      return { ...user };
    },
    async findByEmail(email) {
      return [...users.values()].find((user) => user.email === email.toLowerCase()) ?? null;
    },
    async findById(id) {
      const user = users.get(id);
      return user ? { ...user } : null;
    },
    async list({ filter, page, pageSize }) {
      const matching = [...users.values()].filter((user) =>
        Object.entries(filter).every(([name, value]) => user[name] === value)
      );
      return {
        users: matching.slice((page - 1) * pageSize, page * pageSize).map((user) => ({ ...user })),
        totalItems: matching.length
      };
    },
    async updateById(id, changes) {
      const current = users.get(id);
      if (!current) return null;
      const updated = {
        ...current,
        ...changes,
        notificationPreferences: changes.notificationPreferences
          ? { ...current.notificationPreferences, ...changes.notificationPreferences }
          : current.notificationPreferences,
        updatedAt: new Date()
      };
      users.set(id, updated);
      return { ...updated };
    }
  };
}

async function createFixture() {
  const repository = createMemoryRepository();
  const passwordHasher = createPasswordHasher(4);
  const tokenService = createTokenService({
    secret: "test-secret-that-is-at-least-thirty-two-characters",
    expiresIn: "1h",
    issuer: "fleet-user-service-test",
    audience: "fleet-api-test"
  });
  const userService = createUserService({ repository, passwordHasher, tokenService });
  const app = createUserApplication({ userService, tokenService });

  return { app, repository, passwordHasher, tokenService };
}

test("registers, logs in, verifies JWT, and returns the current user", async () => {
  const { app, tokenService } = await createFixture();
  const registration = await request(app)
    .post("/api/users/register")
    .send({
      name: "Fleet Viewer",
      email: "VIEWER@EXAMPLE.COM",
      password: "correct-password",
      phoneNumber: "+32470000000"
    })
    .expect(201);

  assert.equal(registration.body.data.email, "viewer@example.com");
  assert.equal(registration.body.data.role, "viewer");
  assert.equal(registration.body.data.passwordHash, undefined);

  const login = await request(app)
    .post("/api/users/login")
    .send({ email: "viewer@example.com", password: "correct-password" })
    .expect(200);

  const payload = tokenService.verify(login.body.data.token);
  assert.equal(payload.sub, registration.body.data.id);
  assert.equal(payload.role, "viewer");

  const profile = await request(app)
    .get("/api/users/me")
    .set("Authorization", `Bearer ${login.body.data.token}`)
    .expect(200);
  assert.equal(profile.body.data.id, registration.body.data.id);
});

test("rejects duplicate registration and incorrect passwords", async () => {
  const { app } = await createFixture();
  const body = {
    name: "Duplicate User",
    email: "duplicate@example.com",
    password: "correct-password"
  };

  await request(app).post("/api/users/register").send(body).expect(201);
  const duplicate = await request(app).post("/api/users/register").send(body).expect(409);
  assert.equal(duplicate.body.error.code, "CONFLICT");

  await request(app)
    .post("/api/users/login")
    .send({ email: body.email, password: "wrong-password" })
    .expect(401);
});

test("rejects missing and tampered Bearer tokens", async () => {
  const { app } = await createFixture();
  await request(app).get("/api/users/me").expect(401);
  await request(app)
    .get("/api/users/me")
    .set("Authorization", "Bearer invalid.token.value")
    .expect(401);
});

test("enforces administrator access for user listing and role changes", async () => {
  const { app, repository, passwordHasher, tokenService } = await createFixture();
  const viewer = await repository.create({
    name: "Viewer",
    email: "viewer@example.com",
    passwordHash: await passwordHasher.hash("viewer-password"),
    role: "viewer"
  });
  const admin = await repository.create({
    name: "Administrator",
    email: "admin@example.com",
    passwordHash: await passwordHasher.hash("admin-password"),
    role: "admin"
  });
  const viewerToken = tokenService.sign(viewer);
  const adminToken = tokenService.sign(admin);

  await request(app)
    .get("/api/users")
    .set("Authorization", `Bearer ${viewerToken}`)
    .expect(403);

  const list = await request(app)
    .get("/api/users?page=1&pageSize=10")
    .set("Authorization", `Bearer ${adminToken}`)
    .expect(200);
  assert.equal(list.body.data.length, 2);
  assert.equal(list.body.meta.pagination.totalItems, 2);

  const roleUpdate = await request(app)
    .patch(`/api/users/${viewer.id}/role`)
    .set("Authorization", `Bearer ${adminToken}`)
    .send({ role: "dispatcher" })
    .expect(200);
  assert.equal(roleUpdate.body.data.role, "dispatcher");
});

test("allows profile owners to update preferences but not another user", async () => {
  const { app, repository, passwordHasher, tokenService } = await createFixture();
  const first = await repository.create({
    name: "First User",
    email: "first@example.com",
    passwordHash: await passwordHasher.hash("first-password"),
    role: "viewer"
  });
  const second = await repository.create({
    name: "Second User",
    email: "second@example.com",
    passwordHash: await passwordHasher.hash("second-password"),
    role: "viewer"
  });
  const token = tokenService.sign(first);

  const updated = await request(app)
    .patch(`/api/users/${first.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ notificationPreferences: { criticalEvents: false } })
    .expect(200);
  assert.equal(updated.body.data.notificationPreferences.criticalEvents, false);
  assert.equal(updated.body.data.notificationPreferences.statusChanges, true);

  await request(app)
    .patch(`/api/users/${second.id}`)
    .set("Authorization", `Bearer ${token}`)
    .send({ name: "Forbidden Update" })
    .expect(403);
});
