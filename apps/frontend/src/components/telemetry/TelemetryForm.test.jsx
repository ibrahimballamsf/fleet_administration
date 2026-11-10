import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithTheme } from "../../test/render.jsx";
import TelemetryForm from "./TelemetryForm.jsx";

const vehicle = {
  id: "vehicle-1",
  registrationNumber: "BE-214-XF",
  latestLocation: { coordinates: [4.3517, 50.8503] }
};

describe("TelemetryForm", () => {
  it("shows a read-only explanation when the current role cannot submit telemetry", () => {
    renderWithTheme(<TelemetryForm vehicle={vehicle} canSubmit={false} onSubmit={vi.fn()} />);
    expect(screen.getByText(/viewer role can inspect telemetry/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /submit telemetry/i })).not.toBeInTheDocument();
  });

  it("converts form values into the telemetry API payload", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    renderWithTheme(<TelemetryForm vehicle={vehicle} canSubmit busy={false} onSubmit={onSubmit} />);

    expect(screen.getByRole("spinbutton", { name: /latitude/i })).toHaveValue(50.8503);
    expect(screen.getByRole("spinbutton", { name: /longitude/i })).toHaveValue(4.3517);
    await user.type(screen.getByRole("spinbutton", { name: /speed/i }), "72");
    await user.type(screen.getByRole("spinbutton", { name: /battery/i }), "84");
    await user.type(screen.getByRole("spinbutton", { name: /odometer/i }), "125000.5");
    await user.click(screen.getByRole("button", { name: /submit telemetry/i }));

    expect(onSubmit).toHaveBeenCalledOnce();
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      vehicleId: "vehicle-1",
      latitude: 50.8503,
      longitude: 4.3517,
      speedKph: 72,
      batteryPercent: 84,
      odometerKm: 125000.5,
      engineCondition: "normal",
      eventType: "none"
    });
    expect(onSubmit.mock.calls[0][0].recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it("resets coordinates when a different vehicle is selected", () => {
    const { rerender } = renderWithTheme(<TelemetryForm vehicle={vehicle} canSubmit onSubmit={vi.fn()} />);
    rerender(<TelemetryForm vehicle={{ ...vehicle, id: "vehicle-2", latestLocation: { coordinates: [5, 51] } }} canSubmit onSubmit={vi.fn()} />);
    expect(screen.getByRole("spinbutton", { name: /latitude/i })).toHaveValue(51);
    expect(screen.getByRole("spinbutton", { name: /longitude/i })).toHaveValue(5);
  });
});
