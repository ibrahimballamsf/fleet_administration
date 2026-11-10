import { useEffect, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import {
  Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControlLabel,
  Grid, IconButton, Stack, Switch, TextField, Typography
} from "@mui/material";

const emptyValues = {
  name: "",
  email: "",
  password: "",
  phoneNumber: "",
  criticalEvents: true,
  statusChanges: true
};

export default function UserFormDialog({ open, user, busy, onClose, onSubmit }) {
  const [values, setValues] = useState(emptyValues);
  const editing = Boolean(user);

  useEffect(() => {
    if (!open) return;
    setValues(user ? {
      name: user.name || "",
      email: user.email || "",
      password: "",
      phoneNumber: user.phoneNumber || "",
      criticalEvents: user.notificationPreferences?.criticalEvents ?? true,
      statusChanges: user.notificationPreferences?.statusChanges ?? true
    } : emptyValues);
  }, [open, user]);

  function update(field) {
    return (event) => setValues((current) => ({
      ...current,
      [field]: event.target.type === "checkbox" ? event.target.checked : event.target.value
    }));
  }

  function submit(event) {
    event.preventDefault();
    if (editing) {
      onSubmit({
        name: values.name.trim(),
        phoneNumber: values.phoneNumber.trim() || null,
        notificationPreferences: {
          criticalEvents: values.criticalEvents,
          statusChanges: values.statusChanges
        }
      });
      return;
    }
    onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password,
      ...(values.phoneNumber.trim() ? { phoneNumber: values.phoneNumber.trim() } : {})
    });
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="sm" component="form" onSubmit={submit}>
      <DialogTitle>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <span>{editing ? "Edit user profile" : "Create fleet user"}</span>
          <IconButton aria-label="Close user form" onClick={onClose} disabled={busy} size="small"><CloseRoundedIcon /></IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Typography color="text.secondary" variant="body2" sx={{ mb: 2.5 }}>
          {editing ? "Update contact details and SMS notification preferences." : "The user starts as a viewer and can be assigned another role after creation."}
        </Typography>
        <Grid container spacing={2}>
          <Grid size={12}><TextField label="Full name" value={values.name} onChange={update("name")} required fullWidth autoFocus slotProps={{ htmlInput: { minLength: 2, maxLength: 120 } }} /></Grid>
          {!editing && <Grid size={12}><TextField label="Email address" type="email" value={values.email} onChange={update("email")} required fullWidth /></Grid>}
          {!editing && <Grid size={12}><TextField label="Temporary password" type="password" value={values.password} onChange={update("password")} required fullWidth helperText="Use at least 8 characters and share it securely." slotProps={{ htmlInput: { minLength: 8, maxLength: 72 } }} /></Grid>}
          <Grid size={12}><TextField label="Phone number" value={values.phoneNumber} onChange={update("phoneNumber")} fullWidth placeholder="+32470000000" helperText="Optional · international E.164 format" slotProps={{ htmlInput: { pattern: "^\\+[1-9]\\d{7,14}$" } }} /></Grid>
          {editing && <Grid size={12}>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>SMS notification preferences</Typography>
            <Stack>
              <FormControlLabel control={<Switch checked={values.criticalEvents} onChange={update("criticalEvents")} />} label="Critical vehicle events" />
              <FormControlLabel control={<Switch checked={values.statusChanges} onChange={update("statusChanges")} />} label="Vehicle status changes" />
            </Stack>
          </Grid>}
        </Grid>
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={busy}>Cancel</Button>
        <Button type="submit" variant="contained" disabled={busy}>{busy ? "Saving…" : editing ? "Save changes" : "Create user"}</Button>
      </DialogActions>
    </Dialog>
  );
}
