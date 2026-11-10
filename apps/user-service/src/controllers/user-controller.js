import { sendSuccess } from "@fleet/shared/http";

export function createUserController(userService) {
  return Object.freeze({
    async register(request, response) {
      const user = await userService.register(request.validated.body);
      return sendSuccess(response, { data: user, statusCode: 201 });
    },

    async login(request, response) {
      const session = await userService.login(request.validated.body);
      return sendSuccess(response, { data: session });
    },

    async me(request, response) {
      const user = await userService.getById(request.user.id);
      return sendSuccess(response, { data: user });
    },

    async list(request, response) {
      const result = await userService.list(request.validated.query);
      return sendSuccess(response, { data: result.users, meta: result.meta });
    },

    async getById(request, response) {
      const user = await userService.getById(request.validated.params.id);
      return sendSuccess(response, { data: user });
    },

    async updateProfile(request, response) {
      const user = await userService.updateProfile(
        request.validated.params.id,
        request.validated.body
      );
      return sendSuccess(response, { data: user });
    },

    async updateRole(request, response) {
      const user = await userService.updateRole(
        request.validated.params.id,
        request.validated.body.role
      );
      return sendSuccess(response, { data: user });
    }
  });
}
