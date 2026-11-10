export function createNotificationRepository({ Notification, NotificationAttempt }) {
  return Object.freeze({
    create(values) {
      return Notification.create(values);
    },

    findById(id) {
      return Notification.findById(id).exec();
    },

    updateById(id, changes) {
      return Notification.findByIdAndUpdate(id, { $set: changes }, { new: true, runValidators: true }).exec();
    },

    async list({ filters, page, pageSize }) {
      const query = {};
      if (filters.status) query.status = filters.status;
      if (filters.triggerType) query.triggerType = filters.triggerType;
      if (filters.vehicleId) query.vehicleId = filters.vehicleId;
      const [notifications, totalItems] = await Promise.all([
        Notification.find(query)
          .sort({ createdAt: -1, _id: -1 })
          .skip((page - 1) * pageSize)
          .limit(pageSize)
          .exec(),
        Notification.countDocuments(query).exec()
      ]);
      return { notifications, totalItems };
    },

    createAttempt(values) {
      return NotificationAttempt.create(values);
    },

    listAttempts(notificationId) {
      return NotificationAttempt.find({ notificationId }).sort({ attemptNumber: -1 }).exec();
    }
  });
}
