import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";

export default function EventDialog({ open, vehicle, busy, onClose, onSubmit }) {
  const [form, setForm] = useState({ type: "emergency_stop", message: "" });
  useEffect(() => { if (open) setForm({ type: "emergency_stop", message: "" }); }, [open]);
  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" slotProps={{ paper: { component: "form", onSubmit: (event) => { event.preventDefault(); onSubmit({ ...form, occurredAt: new Date().toISOString() }); } } }}>
      <DialogTitle>Trigger a critical event</DialogTitle>
      <DialogContent dividers><Stack spacing={2.2}><Typography variant="body2" color="text.secondary">This records a critical event for <strong>{vehicle?.registrationNumber}</strong> and triggers the configured SMS notification workflow.</Typography><TextField select label="Event type" value={form.type} onChange={update("type")} fullWidth>{[["engine_fault", "Engine fault"], ["low_battery", "Low battery"], ["emergency_stop", "Emergency stop"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField><TextField label="Event message" value={form.message} onChange={update("message")} multiline minRows={3} fullWidth slotProps={{ htmlInput: { maxLength: 500 } }} /></Stack></DialogContent>
      <DialogActions sx={{ p: 2.2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" color="error" variant="contained" disabled={busy}>{busy ? "Triggering…" : "Trigger event"}</Button></DialogActions>
    </Dialog>
  );
}
