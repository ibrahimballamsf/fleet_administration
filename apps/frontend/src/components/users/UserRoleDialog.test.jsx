import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithTheme } from "../../test/render.jsx";
import UserRoleDialog from "./UserRoleDialog.jsx";

describe("UserRoleDialog", () => {
  it("requires a changed role before submitting", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithTheme(<UserRoleDialog user={{ id: "user-1", name: "Maya", role: "dispatcher" }} busy={false} onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(screen.getByRole("button", { name: "Update role" })).toBeDisabled();
    await user.click(screen.getByLabelText("Access role"));
    await user.click(screen.getByRole("option", { name: "Viewer" }));
    expect(screen.getByText(/read-only access/i)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Update role" }));
    expect(onSubmit).toHaveBeenCalledWith("viewer");
  });

  it("warns before granting administrator permissions", async () => {
    const user = userEvent.setup();
    renderWithTheme(<UserRoleDialog user={{ id: "user-1", name: "Maya", role: "viewer" }} busy={false} onClose={vi.fn()} onSubmit={vi.fn()} />);

    await user.click(screen.getByLabelText("Access role"));
    await user.click(screen.getByRole("option", { name: "Administrator" }));
    expect(screen.getByText(/destructive fleet actions/i)).toBeInTheDocument();
  });
});
