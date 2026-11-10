import { useEffect, useState } from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { Alert, Box, Chip, Dialog, DialogContent, DialogTitle, Divider, IconButton, Skeleton, Stack, Typography } from "@mui/material";
import { notificationApi } from "../../api/index.js";

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "—";
}

function statusColor(status) {
  return status === "sent" ? "success" : status === "failed" ? "error" : "warning";
}

export default function NotificationDetailDialog({ notification, onClose }) {
  const [state, setState] = useState({ loading: true, detail: null, error: null });
  useEffect(() => {
    if (!notification) return undefined;
    const controller = new AbortController();
    setState({ loading: true, detail: null, error: null });
    notificationApi.get(notification.id || notification._id, { signal: controller.signal })
      .then(({ data }) => setState({ loading: false, detail: data, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, detail: null, error }); });
    return () => controller.abort();
  }, [notification]);

  const detail = state.detail;
  return (
    <Dialog open={Boolean(notification)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
          <span>Notification details</span>
          <IconButton aria-label="Close notification details" onClick={onClose} size="small">
            <CloseRoundedIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        {state.loading && <Stack spacing={1.5}>{[1, 2, 3, 4].map((item) => <Skeleton key={item} height={48} />)}</Stack>}
        {state.error && <Alert severity="error">{state.error.message}</Alert>}
        {detail && <Stack spacing={2.2}>
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="h3" sx={{ textTransform: "capitalize" }}>{detail.triggerType?.replaceAll("_", " ")}</Typography><Typography variant="caption" color="text.secondary">{formatDate(detail.createdAt)}</Typography></Box><Chip label={detail.status} color={statusColor(detail.status)} /></Stack>
          <Box><Typography variant="caption" color="text.secondary">Recipient</Typography><Typography variant="body2">{detail.recipientPhoneNumber} · {detail.recipientUserId}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Message</Typography><Typography variant="body2" sx={{ mt: .5, p: 1.5, bgcolor: "#F8FAFD", borderRadius: 2 }}>{detail.message}</Typography></Box>
          {detail.failureReason && <Alert severity="error">{detail.failureReason}</Alert>}
          <Divider />
          <Box><Typography variant="h3">Delivery attempts</Typography><Typography variant="caption" color="text.secondary">Provider: {detail.provider} · {detail.attemptCount || 0} attempt(s)</Typography></Box>
          {(detail.attempts || []).map((attempt) => <Stack key={attempt.id || attempt._id} direction="row" sx={{ justifyContent: "space-between", alignItems: "center", p: 1.5, border: "1px solid", borderColor: "divider", borderRadius: 2 }}><Box><Typography variant="body2" sx={{ fontWeight: 700 }}>Attempt {attempt.attemptNumber}</Typography><Typography variant="caption" color="text.secondary">{formatDate(attempt.completedAt || attempt.requestedAt)}</Typography></Box><Chip size="small" label={attempt.status} color={statusColor(attempt.status)} variant="outlined" /></Stack>)}
          {(detail.attempts || []).length === 0 && <Typography variant="body2" color="text.secondary">No delivery attempts recorded.</Typography>}
        </Stack>}
      </DialogContent>
    </Dialog>
  );
}
