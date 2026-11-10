import { useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid, IconButton, MenuItem,
  Skeleton, Snackbar, Stack, Table, TableBody, TableCell, TableContainer, TableHead,
  TablePagination, TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import SmsRoundedIcon from "@mui/icons-material/SmsRounded";
import VisibilityRoundedIcon from "@mui/icons-material/VisibilityRounded";
import ReplayRoundedIcon from "@mui/icons-material/ReplayRounded";
import FilterAltOffRoundedIcon from "@mui/icons-material/FilterAltOffRounded";
import { notificationApi, vehicleApi } from "../api/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import NotificationDetailDialog from "../components/notifications/NotificationDetailDialog.jsx";
import SendNotificationDialog from "../components/notifications/SendNotificationDialog.jsx";

const emptyFilters = { status: "", triggerType: "", vehicleId: "" };
const entityId = (item) => item?.id || item?._id;

function statusColor(status) {
  return status === "sent" ? "success" : status === "failed" ? "error" : "warning";
}

function triggerLabel(value) {
  return value?.replaceAll("_", " ") || "Unknown";
}

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
}

export default function NotificationsPage() {
  const { user } = useAuth();
  const canSend = ["admin", "dispatcher"].includes(user?.role);
  const canRetry = user?.role === "admin";
  const [vehicles, setVehicles] = useState([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: true, notifications: [], total: 0, error: null });
  const [sendOpen, setSendOpen] = useState(false);
  const [detailNotification, setDetailNotification] = useState(null);
  const [retryNotification, setRetryNotification] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    vehicleApi.list({ page: 1, pageSize: 100 }, { signal: controller.signal })
      .then(({ data }) => setVehicles(data))
      .catch(() => setVehicles([]));
    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    notificationApi.list({ page: page + 1, pageSize, ...appliedFilters }, { signal: controller.signal })
      .then(({ data, meta }) => setState({ loading: false, notifications: data, total: meta?.pagination?.totalItems ?? data.length, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, notifications: [], total: 0, error }); });
    return () => controller.abort();
  }, [page, pageSize, appliedFilters, reloadKey]);

  const vehicleById = useMemo(() => new Map(vehicles.map((vehicle) => [String(entityId(vehicle)), vehicle])), [vehicles]);

  function applyFilters(event) {
    event.preventDefault();
    setPage(0);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(0);
  }

  async function sendNotification(values) {
    setBusy(true);
    try {
      const { data } = await notificationApi.send(values);
      setNotice({ severity: data.status === "sent" ? "success" : "warning", message: `Notification ${data.status}; ${data.summary.sent} sent and ${data.summary.failed} failed.` });
      setSendOpen(false);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function retryDelivery() {
    setBusy(true);
    try {
      const { data } = await notificationApi.retry(entityId(retryNotification));
      setNotice({ severity: data.status === "sent" ? "success" : "error", message: `Retry completed with status: ${data.status}.` });
      setRetryNotification(null);
      setReloadKey((value) => value + 1);
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1720, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 3 }}>
        <Box><Typography variant="h1">Notifications</Typography><Typography color="text.secondary" sx={{ mt: .7 }}>Monitor SMS delivery, inspect attempts, and retry failed notifications.</Typography></Box>
        <Stack direction="row" spacing={1}><Tooltip title="Refresh notifications"><IconButton onClick={() => setReloadKey((value) => value + 1)} aria-label="Refresh notifications" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5 }}><RefreshRoundedIcon /></IconButton></Tooltip>{canSend && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => setSendOpen(true)}>Send notification</Button>}</Stack>
      </Stack>

      <Grid container spacing={2.2} sx={{ mb: 2.2 }}>
        {[
          { label: "Total records", value: state.total, color: "primary.main" },
          { label: "Visible sent", value: state.notifications.filter((item) => item.status === "sent").length, color: "success.main" },
          { label: "Visible failed", value: state.notifications.filter((item) => item.status === "failed").length, color: "error.main" }
        ].map((item) => <Grid key={item.label} size={{ xs: 12, sm: 4 }}><Card><CardContent sx={{ p: 2.3, "&:last-child": { pb: 2.3 } }}><Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{item.label}</Typography>{state.loading ? <Skeleton width={55} height={42} /> : <Typography sx={{ fontSize: 27, fontWeight: 800 }}>{item.value}</Typography>}</Box><Avatar variant="rounded" sx={{ bgcolor: "#E8F0FE", color: item.color, borderRadius: 2.5 }}><SmsRoundedIcon /></Avatar></Stack></CardContent></Card></Grid>)}
      </Grid>

      <Card sx={{ mb: 2.2 }}><CardContent component="form" onSubmit={applyFilters} sx={{ p: 2.3, "&:last-child": { pb: 2.3 } }}><Grid container spacing={1.5} sx={{ alignItems: "center" }}>
        <Grid size={{ xs: 12, md: 3 }}><TextField select size="small" label="Delivery status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} fullWidth>{[["", "All statuses"], ["pending", "Pending"], ["sent", "Sent"], ["failed", "Failed"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 3 }}><TextField select size="small" label="Trigger" value={filters.triggerType} onChange={(event) => setFilters((current) => ({ ...current, triggerType: event.target.value }))} fullWidth>{[["", "All triggers"], ["status_change", "Status change"], ["engine_fault", "Engine fault"], ["low_battery", "Low battery"], ["emergency_stop", "Emergency stop"]].map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 3 }}><TextField select size="small" label="Vehicle" value={filters.vehicleId} onChange={(event) => setFilters((current) => ({ ...current, vehicleId: event.target.value }))} fullWidth><MenuItem value="">All vehicles</MenuItem>{vehicles.map((vehicle) => <MenuItem key={entityId(vehicle)} value={entityId(vehicle)}>{vehicle.registrationNumber}</MenuItem>)}</TextField></Grid>
        <Grid size={{ xs: 12, md: 3 }}><Stack direction="row" spacing={1}><Button type="submit" variant="contained" fullWidth>Apply filters</Button><Tooltip title="Clear filters"><IconButton onClick={resetFilters} aria-label="Clear filters"><FilterAltOffRoundedIcon /></IconButton></Tooltip></Stack></Grid>
      </Grid></CardContent></Card>

      {state.error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button>} sx={{ mb: 2 }}>{state.error.message}</Alert>}
      {!canSend && <Alert severity="info" sx={{ mb: 2 }}>Your viewer role has read-only notification access.</Alert>}

      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}><TableContainer><Table sx={{ minWidth: 940 }}><TableHead><TableRow>{["Recipient", "Vehicle", "Trigger", "Delivery", "Provider", "Created", "Actions"].map((label) => <TableCell key={label} sx={{ bgcolor: "#F8FAFD", fontSize: 12, fontWeight: 800, color: "text.secondary" }}>{label}</TableCell>)}</TableRow></TableHead><TableBody>
        {state.loading && Array.from({ length: 6 }, (_, index) => <TableRow key={index}>{Array.from({ length: 7 }, (__, cell) => <TableCell key={cell}><Skeleton /></TableCell>)}</TableRow>)}
        {!state.loading && state.notifications.map((notification) => { const vehicle = vehicleById.get(String(notification.vehicleId)); return <TableRow key={entityId(notification)} hover><TableCell><Typography sx={{ fontSize: 13.5, fontWeight: 700 }}>{notification.recipientPhoneNumber}</Typography><Typography variant="caption" color="text.secondary">{notification.recipientUserId}</Typography></TableCell><TableCell>{vehicle?.registrationNumber || notification.vehicleId}</TableCell><TableCell><Chip label={triggerLabel(notification.triggerType)} size="small" variant="outlined" sx={{ textTransform: "capitalize" }} /></TableCell><TableCell><Chip label={notification.status} color={statusColor(notification.status)} size="small" /></TableCell><TableCell sx={{ textTransform: "capitalize" }}>{notification.provider}</TableCell><TableCell>{formatDate(notification.createdAt)}</TableCell><TableCell><Stack direction="row" spacing={.3}><Tooltip title="View delivery attempts"><IconButton size="small" onClick={() => setDetailNotification(notification)}><VisibilityRoundedIcon fontSize="small" /></IconButton></Tooltip>{canRetry && notification.status === "failed" && <Tooltip title="Retry delivery"><IconButton size="small" color="primary" onClick={() => setRetryNotification(notification)}><ReplayRoundedIcon fontSize="small" /></IconButton></Tooltip>}</Stack></TableCell></TableRow>; })}
        {!state.loading && state.notifications.length === 0 && <TableRow><TableCell colSpan={7} align="center" sx={{ py: 8 }}><SmsRoundedIcon sx={{ fontSize: 42, color: "text.disabled" }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No notification records match these filters.</Typography></TableCell></TableRow>}
      </TableBody></Table></TableContainer><TablePagination component="div" count={state.total} page={page} onPageChange={(_event, value) => setPage(value)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[5, 10, 20, 50]} /></CardContent></Card>

      <SendNotificationDialog open={sendOpen} vehicles={vehicles} busy={busy} onClose={() => setSendOpen(false)} onSubmit={sendNotification} />
      <NotificationDetailDialog notification={detailNotification} onClose={() => setDetailNotification(null)} />
      <ConfirmDialog open={Boolean(retryNotification)} title="Retry SMS delivery?" confirmLabel="Retry delivery" busy={busy} onClose={() => setRetryNotification(null)} onConfirm={retryDelivery}>A new provider attempt will be recorded for the failed notification to <strong>{retryNotification?.recipientPhoneNumber}</strong>.</ConfirmDialog>
      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>{notice ? <Alert severity={notice.severity} variant="filled" onClose={() => setNotice(null)}>{notice.message}</Alert> : undefined}</Snackbar>
    </Box>
  );
}
