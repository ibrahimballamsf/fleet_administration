import {
  ConflictError,
  NotFoundError,
  UnauthorizedError,
  createPaginationMeta
} from "@fleet/shared/http";

function publicUser(user) {
  const value = user?.toJSON ? user.toJSON() : { ...user };
  if (value._id && !value.id) value.id = String(value._id);
  delete value._id;
  delete value.__v;
  delete value.passwordHash;
  return value;
}

function translatePersistenceError(error) {
  if (error?.code === 11000) {
    return new ConflictError("A user with this email already exists", { cause: error });
  }
  return error;
}

export function createUserService({ repository, passwordHasher, tokenService }) {
  return Object.freeze({
    async register(input) {
      const existing = await repository.findByEmail(input.email);
      if (existing) throw new ConflictError("A user with this email already exists");

      try {
        const user = await repository.create({
          name: input.name,
          email: input.email,
          phoneNumber: input.phoneNumber,
          passwordHash: await passwordHasher.hash(input.password),
          role: "viewer"
        });
        return publicUser(user);
      } catch (error) {
        throw translatePersistenceError(error);
      }
    },

    async login({ email, password }) {
      const user = await repository.findByEmail(email, { includePassword: true });
      const validPassword = user
        ? await passwordHasher.compare(password, user.passwordHash)
        : false;

      if (!user || !user.isActive || !validPassword) {
        throw new UnauthorizedError("Email or password is incorrect");
      }

      const safeUser = publicUser(user);
      return {
        token: tokenService.sign(safeUser),
        tokenType: "Bearer",
        expiresIn: tokenService.expiresIn,
        user: safeUser
      };
    },

    async getById(id) {
      const user = await repository.findById(id);
      if (!user) throw new NotFoundError("User not found");
      return publicUser(user);
    },

    async list({ page, pageSize, role, isActive }) {
      const filter = {};
      if (role !== undefined) filter.role = role;
      if (isActive !== undefined) filter.isActive = isActive;

      const { users, totalItems } = await repository.list({ filter, page, pageSize });
      return {
        users: users.map(publicUser),
        meta: createPaginationMeta({ page, pageSize, totalItems })
      };
    },

    async updateProfile(id, changes) {
      const user = await repository.updateById(id, changes);
      if (!user) throw new NotFoundError("User not found");
      return publicUser(user);
    },

    async updateRole(id, role) {
      const user = await repository.updateById(id, { role });
      if (!user) throw new NotFoundError("User not found");
      return publicUser(user);
    }
  });
}
