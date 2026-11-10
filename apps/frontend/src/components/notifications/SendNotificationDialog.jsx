import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Grid, MenuItem, TextField, Typography } from "@mui/material";

const emptyForm = { recipientUserId: "", recipientPhoneNumber: "", vehicleId: "", triggerType: "status_change", message: "" };

export default function SendNotificationDialog({ open, vehicles, busy, onClose, onSubmit }) {
  const [form, setForm] = useState(emptyForm);
  useEffect(() => { if (open) setForm({ ...emptyForm, vehicleId: vehicles[0] ? vehicles[0].id || vehicles[0]._id : "" }); }, [open, vehicles]);
  const update = (name) => (event) => setForm((current) => ({ ...current, [name]: event.target.value }));

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="md" slotProps={{ paper: { component: "form", onSubmit: (event) => { event.preventDefault(); onSubmit(form); } } }}>
      <DialogTitle>Send an SMS notification</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Create a direct notification and record its delivery result for testing and audit purposes.</Typography>
        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Recipient user ID" value={form.recipientUserId} onChange={update("recipientUserId")} required fullWidth /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField label="Phone number" value={form.recipientPhoneNumber} onChange={update("recipientPhoneNumber")} required fullWidth placeholder="+32470000000" helperText="International E.164 format" slotProps={{ htmlInput: { pattern: "\\+[1-9][0-9]{7,14}" } }} /></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Vehicle" value={form.vehicleId} onChange={update("vehicleId")} required fullWidth>{vehicles.map((vehicle) => <MenuItem key={vehicle.id || vehicle._id} value={vehicle.id || vehicle._id}>{vehicle.registrationNumber} · {vehicle.make} {vehicle.model}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, sm: 6 }}><TextField select label="Trigger" value={form.triggerType} onChange={update("triggerType")} fullWidth>{[["status_change", "Status change"], ["engine_fault", "Engine fault"], ["low_battery", "Low battery"], ["emergency_stop", "Emergency stop"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12 }}><TextField label="SMS message" value={form.message} onChange={update("message")} required multiline minRows={4} fullWidth helperText={`${form.message.length}/1600`} slotProps={{ htmlInput: { maxLength: 1600 } }} /></Grid>
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2.2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy || vehicles.length === 0}>{busy ? "Sending…" : "Send notification"}</Button></DialogActions>
    </Dialog>
  );
}
