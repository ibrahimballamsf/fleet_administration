import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithTheme } from "../../test/render.jsx";
import UserFormDialog from "./UserFormDialog.jsx";

describe("UserFormDialog", () => {
  it("creates a normalized viewer account payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithTheme(<UserFormDialog open busy={false} onClose={vi.fn()} onSubmit={onSubmit} />);

    await user.type(screen.getByRole("textbox", { name: /full name/i }), "  Maya Dispatcher  ");
    await user.type(screen.getByRole("textbox", { name: /email address/i }), "maya@example.com");
    await user.type(screen.getByLabelText(/temporary password/i), "temporary123");
    await user.click(screen.getByRole("button", { name: "Create user" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Maya Dispatcher",
      email: "maya@example.com",
      password: "temporary123"
    });
  });

  it("edits contact details and SMS preferences without exposing account credentials", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    const account = {
      id: "user-1",
      name: "Noah Viewer",
      email: "noah@example.com",
      phoneNumber: "+32470000000",
      notificationPreferences: { criticalEvents: true, statusChanges: false }
    };
    renderWithTheme(<UserFormDialog open user={account} busy={false} onClose={vi.fn()} onSubmit={onSubmit} />);

    expect(screen.queryByLabelText("Email address")).not.toBeInTheDocument();
    expect(screen.queryByLabelText("Temporary password")).not.toBeInTheDocument();
    await user.clear(screen.getByLabelText("Phone number"));
    await user.click(screen.getByRole("switch", { name: "Critical vehicle events" }));
    await user.click(screen.getByRole("switch", { name: "Vehicle status changes" }));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(onSubmit).toHaveBeenCalledWith({
      name: "Noah Viewer",
      phoneNumber: null,
      notificationPreferences: { criticalEvents: false, statusChanges: true }
    });
  });

  it("disables dialog actions while an update is in progress", () => {
    renderWithTheme(<UserFormDialog open busy onClose={vi.fn()} onSubmit={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Close user form" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Saving…" })).toBeDisabled();
  });
});
