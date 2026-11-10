import { useEffect, useState } from "react";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem,
  Stack, TextField, Typography
} from "@mui/material";

const emptyForm = {
  registrationNumber: "", vin: "", make: "", model: "", year: "",
  operationalStatus: "operational", city: "", country: ""
};

function formFromVehicle(vehicle) {
  if (!vehicle) return emptyForm;
  return {
    registrationNumber: vehicle.registrationNumber || "",
    vin: vehicle.vin || "",
    make: vehicle.make || "",
    model: vehicle.model || "",
    year: vehicle.year || "",
    operationalStatus: vehicle.operationalStatus || "operational",
    city: vehicle.address?.city || "",
    country: vehicle.address?.country || ""
  };
}

function payloadFromForm(form, editing) {
  const payload = {
    registrationNumber: form.registrationNumber.trim(),
    make: form.make.trim(),
    model: form.model.trim()
  };
  if (form.vin.trim()) payload.vin = form.vin.trim().toUpperCase();
  else if (editing) payload.vin = null;
  if (form.year) payload.year = Number(form.year);
  else if (editing) payload.year = null;
  if (!editing) payload.operationalStatus = form.operationalStatus;
  if (form.city.trim() || form.country.trim()) {
    payload.address = {
      ...(form.city.trim() ? { city: form.city.trim() } : {}),
      ...(form.country.trim() ? { country: form.country.trim() } : {})
    };
  } else if (editing) payload.address = null;
  return payload;
}

export default function VehicleFormDialog({ open, vehicle, busy, onClose, onSubmit }) {
  const editing = Boolean(vehicle);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    if (open) setForm(formFromVehicle(vehicle));
  }, [open, vehicle]);

  function update(name) {
    return (event) => setForm((current) => ({ ...current, [name]: event.target.value }));
  }

  function submit(event) {
    event.preventDefault();
    onSubmit(payloadFromForm(form, editing));
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md" slotProps={{ paper: { component: "form", onSubmit: submit } }}>
      <DialogTitle sx={{ pb: 1 }}>{editing ? "Edit vehicle" : "Register a vehicle"}</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          {editing ? "Update the fleet record and assignment information." : "Add the vehicle identity and initial operational status."}
        </Typography>
        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField autoFocus label="Registration number" value={form.registrationNumber} onChange={update("registrationNumber")} required fullWidth slotProps={{ htmlInput: { maxLength: 32 } }} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="VIN" value={form.vin} onChange={update("vin")} fullWidth helperText="17 characters, excluding I, O and Q" slotProps={{ htmlInput: { maxLength: 17 } }} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Make" value={form.make} onChange={update("make")} required fullWidth /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Model" value={form.model} onChange={update("model")} required fullWidth /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Year" type="number" value={form.year} onChange={update("year")} fullWidth slotProps={{ htmlInput: { min: 1886, max: new Date().getUTCFullYear() + 1 } }} /></Grid>
          {!editing && <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Initial status" value={form.operationalStatus} onChange={update("operationalStatus")} fullWidth>{[
            ["operational", "Operational"], ["maintenance", "Maintenance"], ["out_of_service", "Out of service"], ["inactive", "Inactive"]
          ].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>}
          <Grid size={{ xs: 12 }}><Stack direction="row" spacing={1} sx={{ alignItems: "center", mt: 1 }}><Typography variant="h3">Primary address</Typography><Typography variant="caption" color="text.secondary">Optional</Typography></Stack></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="City" value={form.city} onChange={update("city")} fullWidth /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Country" value={form.country} onChange={update("country")} fullWidth /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Register vehicle"}</Button></DialogActions>
    </Dialog>
  );
}
