export function classifyTelemetry(input) {
  let eventType = input.eventType ?? "none";

  if (eventType === "none" && input.engineCondition === "fault") {
    eventType = "engine_fault";
  } else if (eventType === "none" && input.batteryPercent !== undefined && input.batteryPercent <= 15) {
    eventType = "low_battery";
  }

  const severity = eventType === "none" ? (input.severity ?? "information") : "critical";
  return { eventType, severity };
}

export function defaultEventMessage(type) {
  return {
    engine_fault: "Vehicle reported an engine fault.",
    low_battery: "Vehicle reported a critically low battery.",
    emergency_stop: "Vehicle reported an emergency stop."
  }[type];
}
