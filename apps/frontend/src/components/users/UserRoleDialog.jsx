import { useEffect, useState } from "react";
import AdminPanelSettingsRoundedIcon from "@mui/icons-material/AdminPanelSettingsRounded";
import { Alert, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, TextField, Typography } from "@mui/material";

const roles = [
  ["admin", "Administrator", "Full access, including roles, retries, and vehicle deletion."],
  ["dispatcher", "Dispatcher", "Can manage vehicles, telemetry, and outgoing notifications."],
  ["viewer", "Viewer", "Read-only access to fleet operations and reports."]
];

export default function UserRoleDialog({ user, busy, onClose, onSubmit }) {
  const [role, setRole] = useState("viewer");
  useEffect(() => { if (user) setRole(user.role || "viewer"); }, [user]);
  const selected = roles.find(([value]) => value === role);

  return (
    <Dialog open={Boolean(user)} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>Change access role</DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Choose the permissions available to <strong>{user?.name}</strong>.</Typography>
        <TextField select label="Access role" value={role} onChange={(event) => setRole(event.target.value)} fullWidth>
          {roles.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>{selected?.[2]}</Typography>
        {role === "admin" && user?.role !== "admin" && <Alert severity="warning" icon={<AdminPanelSettingsRoundedIcon />} sx={{ mt: 2 }}>Administrators can change user access and perform destructive fleet actions.</Alert>}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button variant="contained" onClick={() => onSubmit(role)} disabled={busy || role === user?.role}>{busy ? "Updating…" : "Update role"}</Button>
      </DialogActions>
    </Dialog>
  );
}
