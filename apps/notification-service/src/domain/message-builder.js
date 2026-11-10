export function buildEventMessage(event) {
  const vehicle = event.registrationNumber
    ? `Vehicle ${event.registrationNumber}`
    : `Vehicle ${event.vehicleId}`;

  if (event.message) return `${vehicle}: ${event.message}`;

  if (event.type === "status_change") {
    const transition = `${event.previousStatus ?? "unknown"} to ${event.newStatus ?? "unknown"}`;
    return `${vehicle} status changed from ${transition}${event.reason ? `: ${event.reason}` : "."}`;
  }

  return {
    engine_fault: `${vehicle} reported an engine fault.`,
    low_battery: `${vehicle} reported a critically low battery.`,
    emergency_stop: `${vehicle} reported an emergency stop.`
  }[event.type];
}
