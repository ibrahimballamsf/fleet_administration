import { useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Grid, LinearProgress,
  MenuItem, Skeleton, Snackbar, Stack, Table, TableBody, TableCell, TableContainer,
  TableHead, TablePagination, TableRow, TextField, Typography
} from "@mui/material";
import SpeedRoundedIcon from "@mui/icons-material/SpeedRounded";
import BatteryChargingFullRoundedIcon from "@mui/icons-material/BatteryChargingFullRounded";
import SensorsRoundedIcon from "@mui/icons-material/SensorsRounded";
import LocationOnRoundedIcon from "@mui/icons-material/LocationOnRounded";
import WarningAmberRoundedIcon from "@mui/icons-material/WarningAmberRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import { telemetryApi, vehicleApi } from "../api/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import EventDialog from "../components/telemetry/EventDialog.jsx";
import TelemetryForm from "../components/telemetry/TelemetryForm.jsx";

const entityId = (item) => item?.id || item?._id;

function formatDate(value) {
  return value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "—";
}

function MetricCard({ label, value, detail, icon: Icon, color = "primary.main", loading }) {
  return <Card sx={{ height: "100%" }}><CardContent sx={{ p: 2.3, "&:last-child": { pb: 2.3 } }}><Stack direction="row" sx={{ justifyContent: "space-between" }}><Box><Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700 }}>{label}</Typography>{loading ? <Skeleton width={75} height={43} /> : <Typography sx={{ fontSize: 26, fontWeight: 800, mt: .5 }}>{value}</Typography>}<Typography variant="caption" color="text.secondary">{detail}</Typography></Box><Avatar variant="rounded" sx={{ bgcolor: "#E8F0FE", color, borderRadius: 2.5 }}><Icon /></Avatar></Stack></CardContent></Card>;
}

function severityColor(severity) {
  return severity === "critical" ? "error" : severity === "warning" ? "warning" : "info";
}

export default function TelemetryPage() {
  const { user } = useAuth();
  const canSubmit = ["admin", "dispatcher"].includes(user?.role);
  const [vehicles, setVehicles] = useState([]);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [vehicleError, setVehicleError] = useState(null);
  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [telemetry, setTelemetry] = useState({ loading: false, latest: null, history: [], total: 0, events: [], errors: [] });
  const [busy, setBusy] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    vehicleApi.list({ page: 1, pageSize: 100 }, { signal: controller.signal })
      .then(({ data }) => {
        setVehicles(data);
        setSelectedVehicleId((current) => current || (data[0] ? entityId(data[0]) : ""));
      })
      .catch((error) => { if (error.name !== "AbortError") setVehicleError(error); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!selectedVehicleId) return undefined;
    const controller = new AbortController();
    setTelemetry((current) => ({ ...current, loading: true, errors: [] }));
    Promise.allSettled([
      telemetryApi.latest(selectedVehicleId, { signal: controller.signal }),
      telemetryApi.history(selectedVehicleId, { page: historyPage + 1, pageSize: historyPageSize }, { signal: controller.signal }),
      telemetryApi.events(selectedVehicleId, { signal: controller.signal })
    ]).then(([latest, history, events]) => {
      if (controller.signal.aborted) return;
      const errors = [latest, history, events].filter((result) => result.status === "rejected" && result.reason?.status !== 404).map((result) => result.reason.message);
      setTelemetry({
        loading: false,
        latest: latest.status === "fulfilled" ? latest.value.data : null,
        history: history.status === "fulfilled" ? history.value.data : [],
        total: history.status === "fulfilled" ? history.value.meta?.pagination?.totalItems ?? history.value.data.length : 0,
        events: events.status === "fulfilled" ? events.value.data : [],
        errors
      });
    });
    return () => controller.abort();
  }, [selectedVehicleId, historyPage, historyPageSize, reloadKey]);

  const selectedVehicle = useMemo(() => vehicles.find((vehicle) => String(entityId(vehicle)) === String(selectedVehicleId)), [vehicles, selectedVehicleId]);
  const latest = telemetry.latest;

  async function submitTelemetry(values) {
    setBusy(true);
    try {
      const { data } = await telemetryApi.submit(values);
      const notification = data.integrations?.notification?.status;
      setNotice({ severity: "success", message: `Telemetry stored${notification && notification !== "not_required" ? `; notification ${notification}` : ""}.` });
      setReloadKey((value) => value + 1);
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function submitEvent(values) {
    setBusy(true);
    try {
      const { data } = await telemetryApi.submitEvent(selectedVehicleId, values);
      setNotice({ severity: "success", message: `Event stored; notification ${data.notification?.status || "requested"}.` });
      setEventOpen(false);
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
        <Box><Typography variant="h1">Telemetry simulator</Typography><Typography color="text.secondary" sx={{ mt: .7 }}>Submit readings, inspect history, and trigger critical vehicle events.</Typography></Box>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1}><TextField select size="small" label="Selected vehicle" value={selectedVehicleId} onChange={(event) => { setSelectedVehicleId(event.target.value); setHistoryPage(0); }} sx={{ minWidth: 250 }}>{vehicles.map((vehicle) => <MenuItem key={entityId(vehicle)} value={entityId(vehicle)}>{vehicle.registrationNumber} · {vehicle.make} {vehicle.model}</MenuItem>)}</TextField><Button variant="outlined" startIcon={<RefreshRoundedIcon />} onClick={() => setReloadKey((value) => value + 1)} disabled={!selectedVehicleId}>Refresh</Button>{canSubmit && <Button color="error" variant="contained" startIcon={<WarningAmberRoundedIcon />} onClick={() => setEventOpen(true)} disabled={!selectedVehicleId}>Trigger event</Button>}</Stack>
      </Stack>

      {vehicleError && <Alert severity="error" sx={{ mb: 2 }}>{vehicleError.message}</Alert>}
      {telemetry.errors.length > 0 && <Alert severity="warning" sx={{ mb: 2 }}>{telemetry.errors.join(" ")}</Alert>}
      {!selectedVehicle && !vehicleError && <Alert severity="info">Register a vehicle before submitting telemetry.</Alert>}

      {selectedVehicle && <>
        <Grid container spacing={2.2} sx={{ mb: 2.2 }}>
          <Grid size={{ xs: 6, lg: 3 }}><MetricCard label="Speed" value={latest?.speedKph != null ? `${latest.speedKph} km/h` : "—"} detail="Latest reading" icon={SpeedRoundedIcon} loading={telemetry.loading} /></Grid>
          <Grid size={{ xs: 6, lg: 3 }}><MetricCard label="Battery" value={latest?.batteryPercent != null ? `${latest.batteryPercent}%` : "—"} detail={latest?.batteryPercent != null ? "Charge remaining" : "Not reported"} icon={BatteryChargingFullRoundedIcon} color={latest?.batteryPercent < 20 ? "error.main" : "success.main"} loading={telemetry.loading} /></Grid>
          <Grid size={{ xs: 6, lg: 3 }}><MetricCard label="Engine" value={latest?.engineCondition || "—"} detail="Current condition" icon={SensorsRoundedIcon} loading={telemetry.loading} /></Grid>
          <Grid size={{ xs: 6, lg: 3 }}><MetricCard label="Location" value={latest ? `${Number(latest.latitude).toFixed(3)}, ${Number(latest.longitude).toFixed(3)}` : "—"} detail={latest ? formatDate(latest.recordedAt) : "No readings"} icon={LocationOnRoundedIcon} loading={telemetry.loading} /></Grid>
        </Grid>

        <Grid container spacing={2.2}>
          <Grid size={{ xs: 12, xl: 5 }}><TelemetryForm vehicle={selectedVehicle} busy={busy} canSubmit={canSubmit} onSubmit={submitTelemetry} /></Grid>
          <Grid size={{ xs: 12, xl: 7 }}><Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}><Box sx={{ px: 2.5, pt: 2.5, pb: 1.5 }}><Typography variant="h2">Reading history</Typography><Typography variant="body2" color="text.secondary">Stored telemetry for {selectedVehicle.registrationNumber}</Typography></Box><TableContainer><Table sx={{ minWidth: 720 }}><TableHead><TableRow>{["Recorded", "Speed", "Battery", "Engine", "Event", "Coordinates"].map((label) => <TableCell key={label} sx={{ bgcolor: "#F8FAFD", fontSize: 12, fontWeight: 800, color: "text.secondary" }}>{label}</TableCell>)}</TableRow></TableHead><TableBody>{telemetry.loading && Array.from({ length: 5 }, (_, index) => <TableRow key={index}>{Array.from({ length: 6 }, (__, cell) => <TableCell key={cell}><Skeleton /></TableCell>)}</TableRow>)}{!telemetry.loading && telemetry.history.map((reading) => <TableRow key={reading.id || reading._id}><TableCell>{formatDate(reading.recordedAt)}</TableCell><TableCell>{reading.speedKph != null ? `${reading.speedKph} km/h` : "—"}</TableCell><TableCell>{reading.batteryPercent != null ? `${reading.batteryPercent}%` : "—"}</TableCell><TableCell sx={{ textTransform: "capitalize" }}>{reading.engineCondition}</TableCell><TableCell><Chip label={reading.eventType || "none"} size="small" color={reading.eventType && reading.eventType !== "none" ? severityColor(reading.severity) : "default"} variant="outlined" /></TableCell><TableCell sx={{ fontFamily: "monospace", fontSize: 12 }}>{Number(reading.latitude).toFixed(4)}, {Number(reading.longitude).toFixed(4)}</TableCell></TableRow>)}{!telemetry.loading && telemetry.history.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 6, color: "text.secondary" }}>No telemetry readings stored.</TableCell></TableRow>}</TableBody></Table></TableContainer><TablePagination component="div" count={telemetry.total} page={historyPage} onPageChange={(_event, value) => setHistoryPage(value)} rowsPerPage={historyPageSize} onRowsPerPageChange={(event) => { setHistoryPageSize(Number(event.target.value)); setHistoryPage(0); }} rowsPerPageOptions={[5, 10, 20]} /></CardContent></Card></Grid>
          <Grid size={{ xs: 12 }}><Card><CardContent sx={{ p: 2.5 }}><Typography variant="h2">Critical event timeline</Typography><Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Detected and explicitly submitted vehicle events</Typography>{telemetry.events.length === 0 ? <Typography color="text.secondary" sx={{ py: 3, textAlign: "center" }}>No critical events recorded for this vehicle.</Typography> : <Grid container spacing={1.5}>{telemetry.events.map((event) => <Grid key={event.id || event._id} size={{ xs: 12, md: 6, xl: 4 }}><Card variant="outlined" sx={{ boxShadow: "none" }}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}><Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Chip label={event.type} color={severityColor(event.severity)} size="small" /><Typography variant="caption" color="text.secondary">{formatDate(event.occurredAt)}</Typography></Stack><Typography variant="body2" sx={{ mt: 1.3 }}>{event.message || "No message provided"}</Typography><Typography variant="caption" color="text.secondary">Notification: {event.processingStatus || "detected"}</Typography></CardContent></Card></Grid>)}</Grid>}</CardContent></Card></Grid>
        </Grid>
      </>}

      <EventDialog open={eventOpen} vehicle={selectedVehicle} busy={busy} onClose={() => setEventOpen(false)} onSubmit={submitEvent} />
      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>{notice ? <Alert severity={notice.severity} variant="filled" onClose={() => setNotice(null)}>{notice.message}</Alert> : undefined}</Snackbar>
    </Box>
  );
}
