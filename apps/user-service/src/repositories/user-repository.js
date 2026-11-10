export function createUserRepository(User) {
  return {
    async create(values) {
      return User.create(values);
    },

    async findByEmail(email, { includePassword = false } = {}) {
      const query = User.findOne({ email: email.toLowerCase() });
      if (includePassword) query.select("+passwordHash");
      return query.exec();
    },

    async findById(id) {
      return User.findById(id).exec();
    },

    async list({ filter, page, pageSize }) {
      const [users, totalItems] = await Promise.all([
        User.find(filter)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .exec(),
        User.countDocuments(filter).exec()
      ]);

      return { users, totalItems };
    },

    async updateById(id, changes) {
      const update = { ...changes };
      if (changes.notificationPreferences) {
        delete update.notificationPreferences;
        for (const [name, value] of Object.entries(changes.notificationPreferences)) {
          update[`notificationPreferences.${name}`] = value;
        }
      }

      return User.findByIdAndUpdate(id, { $set: update }, {
        new: true,
        runValidators: true
      }).exec();
    }
  };
}
