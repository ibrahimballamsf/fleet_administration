import { useCallback, useEffect, useState } from "react";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, Dialog, DialogContent,
  DialogTitle, Grid, IconButton, InputAdornment, MenuItem, Skeleton, Snackbar,
  Stack, Table, TableBody, TableCell, TableContainer, TableHead, TablePagination,
  TableRow, TextField, Tooltip, Typography
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import FilterAltOffRoundedIcon from "@mui/icons-material/FilterAltOffRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import SwapHorizRoundedIcon from "@mui/icons-material/SwapHorizRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import HistoryRoundedIcon from "@mui/icons-material/HistoryRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { vehicleApi } from "../api/index.js";
import { useAuth } from "../auth/AuthContext.jsx";
import ConfirmDialog from "../components/ConfirmDialog.jsx";
import VehicleFormDialog from "../components/vehicles/VehicleFormDialog.jsx";
import VehicleStatusDialog from "../components/vehicles/VehicleStatusDialog.jsx";

const statusOptions = [
  ["", "All statuses"], ["operational", "Operational"], ["maintenance", "Maintenance"],
  ["out_of_service", "Out of service"], ["emergency", "Emergency"], ["inactive", "Inactive"]
];

const statusPresentation = {
  operational: { label: "Operational", color: "success" },
  maintenance: { label: "Maintenance", color: "warning" },
  out_of_service: { label: "Out of service", color: "primary" },
  emergency: { label: "Emergency", color: "error" },
  inactive: { label: "Inactive", color: "default" }
};

const emptyFilters = { registrationNumber: "", make: "", model: "", status: "" };
const vehicleId = (vehicle) => vehicle?.id || vehicle?._id;

function formatDate(value) {
  if (!value) return "—";
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

function StatusHistoryDialog({ vehicle, onClose }) {
  const [state, setState] = useState({ loading: true, items: [], error: null });
  useEffect(() => {
    if (!vehicle) return undefined;
    const controller = new AbortController();
    setState({ loading: true, items: [], error: null });
    vehicleApi.statusHistory(vehicleId(vehicle), { signal: controller.signal })
      .then(({ data }) => setState({ loading: false, items: data, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, items: [], error }); });
    return () => controller.abort();
  }, [vehicle]);

  return (
    <Dialog open={Boolean(vehicle)} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Status history · {vehicle?.registrationNumber}</DialogTitle>
      <DialogContent dividers>
        {state.error && <Alert severity="error">{state.error.message}</Alert>}
        {state.loading && <Stack spacing={1.5}>{[1, 2, 3].map((item) => <Skeleton key={item} height={58} />)}</Stack>}
        {!state.loading && !state.error && state.items.length === 0 && <Typography color="text.secondary" sx={{ py: 5, textAlign: "center" }}>No status changes recorded.</Typography>}
        <Stack spacing={1.5}>{state.items.map((entry) => {
          const status = statusPresentation[entry.toStatus] || statusPresentation.inactive;
          return <Card key={entry.id || entry._id} variant="outlined" sx={{ boxShadow: "none" }}><CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}><Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center" }}><Box><Chip label={status.label} color={status.color} size="small" variant="outlined" /><Typography variant="body2" sx={{ mt: 1 }}>{entry.reason || "No reason provided"}</Typography></Box><Typography variant="caption" color="text.secondary">{formatDate(entry.changedAt)}</Typography></Stack></CardContent></Card>;
        })}</Stack>
      </DialogContent>
    </Dialog>
  );
}

export default function VehiclesPage() {
  const { user } = useAuth();
  const canManage = ["admin", "dispatcher"].includes(user?.role);
  const canDelete = user?.role === "admin";
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [reloadKey, setReloadKey] = useState(0);
  const [state, setState] = useState({ loading: true, vehicles: [], total: 0, error: null });
  const [formVehicle, setFormVehicle] = useState(undefined);
  const [formOpen, setFormOpen] = useState(false);
  const [statusVehicle, setStatusVehicle] = useState(null);
  const [deleteVehicle, setDeleteVehicle] = useState(null);
  const [historyVehicle, setHistoryVehicle] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    vehicleApi.list({ page: page + 1, pageSize, ...appliedFilters }, { signal: controller.signal })
      .then(({ data, meta }) => setState({ loading: false, vehicles: data, total: meta?.pagination?.totalItems ?? data.length, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, vehicles: [], total: 0, error }); });
    return () => controller.abort();
  }, [page, pageSize, appliedFilters, reloadKey]);

  const refresh = useCallback(() => setReloadKey((value) => value + 1), []);

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

  async function saveVehicle(values) {
    setBusy(true);
    try {
      if (formVehicle) await vehicleApi.update(vehicleId(formVehicle), values);
      else await vehicleApi.create(values);
      setNotice({ severity: "success", message: formVehicle ? "Vehicle updated." : "Vehicle registered." });
      setFormOpen(false);
      refresh();
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function updateStatus(values) {
    setBusy(true);
    try {
      await vehicleApi.updateStatus(vehicleId(statusVehicle), values);
      setNotice({ severity: "success", message: "Operational status updated and notification workflow triggered." });
      setStatusVehicle(null);
      refresh();
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  async function removeVehicle() {
    setBusy(true);
    try {
      await vehicleApi.remove(vehicleId(deleteVehicle));
      setNotice({ severity: "success", message: "Vehicle deleted." });
      setDeleteVehicle(null);
      if (state.vehicles.length === 1 && page > 0) setPage((value) => value - 1);
      else refresh();
    } catch (error) {
      setNotice({ severity: "error", message: error.message });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1720, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 3 }}>
        <Box><Typography variant="h1">Vehicles</Typography><Typography color="text.secondary" sx={{ mt: 0.7 }}>Register, filter, and manage operational fleet records.</Typography></Box>
        <Stack direction="row" spacing={1}><Tooltip title="Refresh vehicles"><IconButton onClick={refresh} aria-label="Refresh vehicles" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5 }}><RefreshRoundedIcon /></IconButton></Tooltip>{canManage && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={() => { setFormVehicle(undefined); setFormOpen(true); }}>Register vehicle</Button>}</Stack>
      </Stack>

      <Card sx={{ mb: 2.2 }}><CardContent component="form" onSubmit={applyFilters} sx={{ p: 2.3, "&:last-child": { pb: 2.3 } }}>
        <Grid container spacing={1.5} sx={{ alignItems: "center" }}>
          <Grid size={{ xs: 12, md: 3 }}><TextField size="small" label="Registration" value={filters.registrationNumber} onChange={(event) => setFilters((current) => ({ ...current, registrationNumber: event.target.value }))} fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment> } }} /></Grid>
          <Grid size={{ xs: 6, md: 2 }}><TextField size="small" label="Make" value={filters.make} onChange={(event) => setFilters((current) => ({ ...current, make: event.target.value }))} fullWidth /></Grid>
          <Grid size={{ xs: 6, md: 2 }}><TextField size="small" label="Model" value={filters.model} onChange={(event) => setFilters((current) => ({ ...current, model: event.target.value }))} fullWidth /></Grid>
          <Grid size={{ xs: 12, md: 2.5 }}><TextField select size="small" label="Status" value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))} fullWidth>{statusOptions.map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}</TextField></Grid>
          <Grid size={{ xs: 12, md: 2.5 }}><Stack direction="row" spacing={1}><Button type="submit" variant="contained" fullWidth>Apply filters</Button><Tooltip title="Clear filters"><IconButton onClick={resetFilters} aria-label="Clear filters"><FilterAltOffRoundedIcon /></IconButton></Tooltip></Stack></Grid>
        </Grid>
      </CardContent></Card>

      {state.error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={refresh}>Retry</Button>} sx={{ mb: 2 }}>{state.error.message}</Alert>}
      {!canManage && <Alert severity="info" sx={{ mb: 2 }}>Your viewer role has read-only vehicle access.</Alert>}

      <Card><CardContent sx={{ p: 0, "&:last-child": { pb: 0 } }}>
        <TableContainer><Table sx={{ minWidth: 900 }}>
          <TableHead><TableRow>{["Vehicle", "VIN", "Status", "Location", "Last telemetry", "Actions"].map((label) => <TableCell key={label} sx={{ bgcolor: "#F8FAFD", color: "text.secondary", fontWeight: 800, fontSize: 12 }}>{label}</TableCell>)}</TableRow></TableHead>
          <TableBody>
            {state.loading && Array.from({ length: 6 }, (_, index) => <TableRow key={index}>{Array.from({ length: 6 }, (__, cell) => <TableCell key={cell}><Skeleton /></TableCell>)}</TableRow>)}
            {!state.loading && state.vehicles.map((vehicle) => {
              const presentation = statusPresentation[vehicle.operationalStatus] || statusPresentation.inactive;
              return <TableRow key={vehicleId(vehicle)} hover><TableCell><Stack direction="row" spacing={1.3} sx={{ alignItems: "center" }}><Avatar variant="rounded" sx={{ bgcolor: "#E8F0FE", color: "primary.main", borderRadius: 2 }}><DirectionsCarRoundedIcon /></Avatar><Box><Typography sx={{ fontWeight: 750, fontSize: 13.5 }}>{vehicle.make} {vehicle.model}</Typography><Typography variant="caption" color="text.secondary">{vehicle.registrationNumber}{vehicle.year ? ` · ${vehicle.year}` : ""}</Typography></Box></Stack></TableCell><TableCell sx={{ fontFamily: "monospace", fontSize: 12.5 }}>{vehicle.vin || "—"}</TableCell><TableCell><Chip label={presentation.label} color={presentation.color} size="small" variant="outlined" /></TableCell><TableCell>{vehicle.address?.city || (vehicle.latestLocation ? "GPS available" : "Not reported")}</TableCell><TableCell>{formatDate(vehicle.lastTelemetryAt)}</TableCell><TableCell><Stack direction="row" spacing={0.3}><Tooltip title="Status history"><IconButton size="small" onClick={() => setHistoryVehicle(vehicle)}><HistoryRoundedIcon fontSize="small" /></IconButton></Tooltip>{canManage && <><Tooltip title="Edit vehicle"><IconButton size="small" onClick={() => { setFormVehicle(vehicle); setFormOpen(true); }}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip><Tooltip title="Change status"><IconButton size="small" onClick={() => setStatusVehicle(vehicle)}><SwapHorizRoundedIcon fontSize="small" /></IconButton></Tooltip></>}{canDelete && <Tooltip title="Delete vehicle"><IconButton size="small" color="error" onClick={() => setDeleteVehicle(vehicle)}><DeleteOutlineRoundedIcon fontSize="small" /></IconButton></Tooltip>}</Stack></TableCell></TableRow>;
            })}
            {!state.loading && state.vehicles.length === 0 && <TableRow><TableCell colSpan={6} align="center" sx={{ py: 8 }}><DirectionsCarRoundedIcon sx={{ fontSize: 42, color: "text.disabled" }} /><Typography color="text.secondary" sx={{ mt: 1 }}>No vehicles match these filters.</Typography></TableCell></TableRow>}
          </TableBody>
        </Table></TableContainer>
        <TablePagination component="div" count={state.total} page={page} onPageChange={(_event, nextPage) => setPage(nextPage)} rowsPerPage={pageSize} onRowsPerPageChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} rowsPerPageOptions={[5, 10, 20, 50]} />
      </CardContent></Card>

      <VehicleFormDialog open={formOpen} vehicle={formVehicle} busy={busy} onClose={() => setFormOpen(false)} onSubmit={saveVehicle} />
      <VehicleStatusDialog open={Boolean(statusVehicle)} vehicle={statusVehicle} busy={busy} onClose={() => setStatusVehicle(null)} onSubmit={updateStatus} />
      <ConfirmDialog open={Boolean(deleteVehicle)} title="Delete vehicle?" confirmLabel="Delete vehicle" destructive busy={busy} onClose={() => setDeleteVehicle(null)} onConfirm={removeVehicle}>This permanently removes <strong>{deleteVehicle?.registrationNumber}</strong> from the fleet. Existing telemetry and notification records are owned by other services and are not deleted.</ConfirmDialog>
      <StatusHistoryDialog vehicle={historyVehicle} onClose={() => setHistoryVehicle(null)} />
      <Snackbar open={Boolean(notice)} autoHideDuration={5000} onClose={() => setNotice(null)} anchorOrigin={{ vertical: "bottom", horizontal: "right" }}>{notice ? <Alert severity={notice.severity} variant="filled" onClose={() => setNotice(null)}>{notice.message}</Alert> : undefined}</Snackbar>
    </Box>
  );
}
