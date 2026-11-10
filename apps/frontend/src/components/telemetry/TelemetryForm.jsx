import { useEffect, useState } from "react";
import { Alert, Button, Card, CardContent, Grid, MenuItem, Stack, TextField, Typography } from "@mui/material";
import SendRoundedIcon from "@mui/icons-material/SendRounded";

function localDateTime() {
  const date = new Date(Date.now() - new Date().getTimezoneOffset() * 60000);
  return date.toISOString().slice(0, 16);
}

function initialForm(vehicle) {
  const coordinates = vehicle?.latestLocation?.coordinates || [];
  return {
    latitude: coordinates[1] ?? "",
    longitude: coordinates[0] ?? "",
    speedKph: "",
    batteryPercent: "",
    engineCondition: "normal",
    odometerKm: "",
    eventType: "none",
    severity: "information",
    recordedAt: localDateTime()
  };
}

function numberWhenPresent(value) {
  return value === "" ? undefined : Number(value);
}

export default function TelemetryForm({ vehicle, busy, canSubmit, onSubmit }) {
  const [form, setForm] = useState(() => initialForm(vehicle));
  useEffect(() => setForm(initialForm(vehicle)), [vehicle]);

  function update(name) {
    return (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    const payload = {
      vehicleId: vehicle.id || vehicle._id,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      engineCondition: form.engineCondition,
      eventType: form.eventType,
      recordedAt: new Date(form.recordedAt).toISOString()
    };
    for (const field of ["speedKph", "batteryPercent", "odometerKm"]) {
      const value = numberWhenPresent(form[field]);
      if (value !== undefined) payload[field] = value;
    }
    if (form.eventType !== "none") payload.severity = form.severity;
    onSubmit(payload);
  }

  if (!canSubmit) return <Alert severity="info">Your viewer role can inspect telemetry but cannot submit readings.</Alert>;

  return (
    <Card><CardContent component="form" onSubmit={submit} sx={{ p: 2.6 }}>
      <Typography variant="h2">Telemetry simulator</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mt: .5, mb: 2.5 }}>Submit a realistic reading for {vehicle.registrationNumber}.</Typography>
      <Grid container spacing={1.8}>
        <Grid size={{ xs: 6 }}><TextField label="Latitude" type="number" value={form.latitude} onChange={update("latitude")} required fullWidth slotProps={{ htmlInput: { min: -90, max: 90, step: "any" } }} /></Grid>
        <Grid size={{ xs: 6 }}><TextField label="Longitude" type="number" value={form.longitude} onChange={update("longitude")} required fullWidth slotProps={{ htmlInput: { min: -180, max: 180, step: "any" } }} /></Grid>
        <Grid size={{ xs: 6 }}><TextField label="Speed (km/h)" type="number" value={form.speedKph} onChange={update("speedKph")} fullWidth slotProps={{ htmlInput: { min: 0, step: "any" } }} /></Grid>
        <Grid size={{ xs: 6 }}><TextField label="Battery (%)" type="number" value={form.batteryPercent} onChange={update("batteryPercent")} fullWidth slotProps={{ htmlInput: { min: 0, max: 100, step: "any" } }} /></Grid>
        <Grid size={{ xs: 6 }}><TextField select label="Engine condition" value={form.engineCondition} onChange={update("engineCondition")} fullWidth>{["normal", "warning", "fault", "off"].map((value) => <MenuItem key={value} value={value} sx={{ textTransform: "capitalize" }}>{value}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 6 }}><TextField label="Odometer (km)" type="number" value={form.odometerKm} onChange={update("odometerKm")} fullWidth slotProps={{ htmlInput: { min: 0, step: "any" } }} /></Grid>
        <Grid size={{ xs: 6 }}><TextField select label="Vehicle event" value={form.eventType} onChange={update("eventType")} fullWidth>{[["none", "No event"], ["engine_fault", "Engine fault"], ["low_battery", "Low battery"], ["emergency_stop", "Emergency stop"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 6 }}><TextField select label="Severity" value={form.severity} onChange={update("severity")} disabled={form.eventType === "none"} fullWidth>{["information", "warning", "critical"].map((value) => <MenuItem key={value} value={value} sx={{ textTransform: "capitalize" }}>{value}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12 }}><TextField label="Recorded at" type="datetime-local" value={form.recordedAt} onChange={update("recordedAt")} required fullWidth slotProps={{ inputLabel: { shrink: true } }} /></Grid>
      </Grid>
      <Stack direction="row" sx={{ justifyContent: "flex-end", mt: 2.5 }}><Button type="submit" variant="contained" startIcon={<SendRoundedIcon />} disabled={busy}>{busy ? "Submitting…" : "Submit telemetry"}</Button></Stack>
    </CardContent></Card>
  );
}
