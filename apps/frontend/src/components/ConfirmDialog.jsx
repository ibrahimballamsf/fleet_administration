import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

export default function ConfirmDialog({ open, title, children, confirmLabel = "Confirm", busy, destructive, onClose, onConfirm }) {
  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} fullWidth maxWidth="xs">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent><Typography variant="body2" color="text.secondary">{children}</Typography></DialogContent>
      <DialogActions sx={{ p: 2.2 }}><Button onClick={onClose} disabled={busy}>Cancel</Button><Button onClick={onConfirm} color={destructive ? "error" : "primary"} variant="contained" disabled={busy}>{busy ? "Working…" : confirmLabel}</Button></DialogActions>
    </Dialog>
  );
}
