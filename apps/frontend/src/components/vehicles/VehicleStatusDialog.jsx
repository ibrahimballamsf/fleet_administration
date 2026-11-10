import { useEffect, useState } from "react";
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from "@mui/material";

const statuses = [
  ["operational", "Operational"], ["maintenance", "Maintenance"],
  ["out_of_service", "Out of service"], ["emergency", "Emergency"], ["inactive", "Inactive"]
];

export default function VehicleStatusDialog({ open, vehicle, busy, onClose, onSubmit }) {
  const [status, setStatus] = useState("operational");
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setStatus(vehicle?.operationalStatus || "operational");
      setReason("");
    }
  }, [open, vehicle]);

  function submit(event) {
    event.preventDefault();
    onSubmit({ status, ...(reason.trim() ? { reason: reason.trim() } : {}) });
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" slotProps={{ paper: { component: "form", onSubmit: submit } }}>
      <DialogTitle>Update operational status</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2.4}>
          <Typography variant="body2" color="text.secondary">Changing <strong>{vehicle?.registrationNumber}</strong> may trigger an SMS notification to fleet administrators.</Typography>
          <TextField select label="New status" value={status} onChange={(event) => setStatus(event.target.value)} fullWidth>{statuses.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField>
          <TextField label="Reason" value={reason} onChange={(event) => setReason(event.target.value)} multiline minRows={3} fullWidth slotProps={{ htmlInput: { maxLength: 500 } }} helperText={`${reason.length}/500`} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ p: 2.2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button type="submit" variant="contained" disabled={busy || status === vehicle?.operationalStatus}>{busy ? "Updating…" : "Update status"}</Button></DialogActions>
    </Dialog>
  );
}
