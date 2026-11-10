import { useEffect, useMemo, useState } from "react";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress, Divider,
  IconButton, InputAdornment, List, ListItemButton, ListItemText, Slider, Stack,
  TextField, Tooltip, Typography
} from "@mui/material";
import SearchRoundedIcon from "@mui/icons-material/SearchRounded";
import DirectionsCarRoundedIcon from "@mui/icons-material/DirectionsCarRounded";
import MyLocationRoundedIcon from "@mui/icons-material/MyLocationRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import RouteRoundedIcon from "@mui/icons-material/RouteRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import { geolocationApi, vehicleApi } from "../api/index.js";

const defaultCenter = [50.8503, 4.3517];
const entityId = (item) => item?.id || item?._id;

function relativeTime(value) {
  if (!value) return "Unknown";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.floor(minutes / 60)} hr ago`;
  return `${Math.floor(minutes / 1440)} days ago`;
}

function MapController({ locations, focus }) {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    if (focus) {
      map.setView([focus.latitude, focus.longitude], 13, { animate: true });
      return;
    }
    if (locations.length === 1) map.setView([locations[0].latitude, locations[0].longitude], 13);
    else if (locations.length > 1) map.fitBounds(locations.map((item) => [item.latitude, item.longitude]), { padding: [35, 35], maxZoom: 13 });
  }, [map, locations, focus]);
  return null;
}

function VehicleMarker({ location, vehicle, selected, onSelect }) {
  const label = vehicle?.registrationNumber || `Vehicle ${location.vehicleId}`;
  return (
    <CircleMarker
      center={[location.latitude, location.longitude]}
      radius={selected ? 11 : 8}
      pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: selected ? "#D94A4A" : "#0B57D0", fillOpacity: 1 }}
      eventHandlers={{ click: () => onSelect(location.vehicleId) }}
    >
      <Popup><Typography sx={{ fontWeight: 800, fontSize: 14 }}>{label}</Typography><Typography sx={{ fontSize: 12 }}>{vehicle ? `${vehicle.make} ${vehicle.model}` : "Vehicle location"}</Typography><Typography sx={{ fontSize: 12, color: "text.secondary" }}>{location.address || `${location.latitude.toFixed(5)}, ${location.longitude.toFixed(5)}`}</Typography><Typography sx={{ mt: .5, fontSize: 11.5, color: "text.secondary" }}>Reported {relativeTime(location.recordedAt)}</Typography></Popup>
    </CircleMarker>
  );
}

export default function MapPage() {
  const [state, setState] = useState({ loading: true, locations: [], vehicles: [], error: null });
  const [reloadKey, setReloadKey] = useState(0);
  const [selectedVehicleId, setSelectedVehicleId] = useState(null);
  const [address, setAddress] = useState("");
  const [searchCenter, setSearchCenter] = useState(null);
  const [radiusKm, setRadiusKm] = useState(10);
  const [nearbyLocations, setNearbyLocations] = useState(null);
  const [searching, setSearching] = useState(false);
  const [operationError, setOperationError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    Promise.all([
      geolocationApi.listLocations({ limit: 500 }, { signal: controller.signal }),
      vehicleApi.list({ page: 1, pageSize: 100 }, { signal: controller.signal })
    ]).then(([locations, vehicles]) => setState({ loading: false, locations: locations.data, vehicles: vehicles.data, error: null }))
      .catch((error) => { if (error.name !== "AbortError") setState({ loading: false, locations: [], vehicles: [], error }); });
    return () => controller.abort();
  }, [reloadKey]);

  const vehicleById = useMemo(() => new Map(state.vehicles.map((vehicle) => [String(entityId(vehicle)), vehicle])), [state.vehicles]);
  const displayedLocations = nearbyLocations ?? state.locations;
  const selectedLocation = state.locations.find((item) => String(item.vehicleId) === String(selectedVehicleId));
  const selectedVehicle = vehicleById.get(String(selectedVehicleId));

  async function geocodeAddress(event) {
    event.preventDefault();
    if (!address.trim()) return;
    setSearching(true);
    setOperationError(null);
    try {
      const { data } = await geolocationApi.geocode({ address: address.trim() });
      setSearchCenter({ latitude: data.latitude, longitude: data.longitude, label: data.displayName });
      setNearbyLocations(null);
      setSelectedVehicleId(null);
    } catch (error) {
      setOperationError(error.message);
    } finally {
      setSearching(false);
    }
  }

  async function searchNearby() {
    const origin = selectedLocation || searchCenter;
    if (!origin) return;
    setSearching(true);
    setOperationError(null);
    try {
      const response = selectedLocation
        ? await geolocationApi.nearbyVehicle(selectedLocation.vehicleId, { radiusKm, limit: 100 })
        : await geolocationApi.nearby({ latitude: origin.latitude, longitude: origin.longitude, radiusKm, limit: 100 });
      setNearbyLocations(response.data);
    } catch (error) {
      setOperationError(error.message);
    } finally {
      setSearching(false);
    }
  }

  function showAll() {
    setNearbyLocations(null);
    setSearchCenter(null);
    setSelectedVehicleId(null);
    setOperationError(null);
  }

  return (
    <Box sx={{ p: { xs: 2, sm: 3, xl: 4 }, maxWidth: 1720, mx: "auto" }}>
      <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ justifyContent: "space-between", alignItems: { xs: "stretch", md: "center" }, mb: 3 }}>
        <Box><Typography variant="h1">Live map</Typography><Typography color="text.secondary" sx={{ mt: .7 }}>Monitor reported positions and search for nearby vehicles.</Typography></Box>
        <Stack direction="row" spacing={1}><Tooltip title="Refresh locations"><IconButton onClick={() => setReloadKey((value) => value + 1)} aria-label="Refresh locations" sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2.5 }}><RefreshRoundedIcon /></IconButton></Tooltip>{(nearbyLocations || searchCenter) && <Button variant="outlined" startIcon={<CloseRoundedIcon />} onClick={showAll}>Clear search</Button>}</Stack>
      </Stack>

      {state.error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => setReloadKey((value) => value + 1)}>Retry</Button>} sx={{ mb: 2 }}>{state.error.message}</Alert>}
      {operationError && <Alert severity="warning" onClose={() => setOperationError(null)} sx={{ mb: 2 }}>{operationError}</Alert>}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "370px minmax(0, 1fr)" }, gap: 2.2, minHeight: { lg: 690 } }}>
        <Card sx={{ order: { xs: 2, lg: 1 }, minHeight: 0 }}><CardContent sx={{ p: 0, "&:last-child": { pb: 0 }, height: "100%", display: "flex", flexDirection: "column" }}>
          <Box component="form" onSubmit={geocodeAddress} sx={{ p: 2.2 }}>
            <Typography variant="h3" sx={{ mb: 1.5 }}>Search a location</Typography>
            <TextField value={address} onChange={(event) => setAddress(event.target.value)} placeholder="Address, city or postcode" size="small" fullWidth slotProps={{ input: { startAdornment: <InputAdornment position="start"><SearchRoundedIcon fontSize="small" /></InputAdornment>, endAdornment: searching ? <InputAdornment position="end"><CircularProgress size={18} /></InputAdornment> : null } }} />
            <Button type="submit" size="small" sx={{ mt: 1 }} disabled={searching || !address.trim()}>Locate address</Button>
          </Box>
          <Divider />
          {(selectedLocation || searchCenter) && <Box sx={{ p: 2.2, bgcolor: "#F8FAFD" }}>
            <Stack direction="row" spacing={1.2} sx={{ alignItems: "flex-start" }}><Avatar variant="rounded" sx={{ bgcolor: "#E8F0FE", color: "primary.main", borderRadius: 2 }}><MyLocationRoundedIcon /></Avatar><Box sx={{ minWidth: 0 }}><Typography sx={{ fontWeight: 750, fontSize: 13.5 }}>{selectedVehicle?.registrationNumber || searchCenter?.label || "Selected origin"}</Typography><Typography noWrap variant="caption" color="text.secondary">{selectedLocation?.address || (selectedLocation ? `${selectedLocation.latitude.toFixed(5)}, ${selectedLocation.longitude.toFixed(5)}` : "Geocoded location")}</Typography></Box></Stack>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>Search radius · {radiusKm} km</Typography>
            <Slider value={radiusKm} onChange={(_event, value) => setRadiusKm(value)} min={1} max={100} valueLabelDisplay="auto" aria-label="Nearby search radius" />
            <Button variant="contained" fullWidth startIcon={<RouteRoundedIcon />} onClick={searchNearby} disabled={searching}>{searching ? "Searching…" : "Find nearby vehicles"}</Button>
          </Box>}
          <Stack direction="row" sx={{ justifyContent: "space-between", alignItems: "center", px: 2.2, py: 1.7 }}><Box><Typography variant="h3">{nearbyLocations ? "Nearby results" : "Reported vehicles"}</Typography><Typography variant="caption" color="text.secondary">{displayedLocations.length} location{displayedLocations.length === 1 ? "" : "s"}</Typography></Box>{nearbyLocations && <Chip label={`${radiusKm} km`} size="small" color="primary" />}</Stack>
          <Divider />
          <List disablePadding sx={{ overflowY: "auto", flex: 1, maxHeight: { xs: 370, lg: 405 } }}>
            {state.loading && <Stack sx={{ alignItems: "center", py: 7 }}><CircularProgress size={28} /></Stack>}
            {!state.loading && displayedLocations.map((location) => {
              const vehicle = vehicleById.get(String(location.vehicleId));
              const selected = String(selectedVehicleId) === String(location.vehicleId);
              return <ListItemButton key={location.id || location.vehicleId} selected={selected} onClick={() => { setSelectedVehicleId(location.vehicleId); setSearchCenter(null); }} sx={{ borderBottom: "1px solid", borderColor: "divider", py: 1.5 }}><Avatar variant="rounded" sx={{ mr: 1.5, width: 38, height: 38, bgcolor: selected ? "primary.main" : "#E8F0FE", color: selected ? "white" : "primary.main", borderRadius: 2 }}><DirectionsCarRoundedIcon fontSize="small" /></Avatar><ListItemText primary={vehicle?.registrationNumber || `Vehicle ${location.vehicleId}`} secondary={`${vehicle ? `${vehicle.make} ${vehicle.model} · ` : ""}${relativeTime(location.recordedAt)}`} slotProps={{ primary: { sx: { fontWeight: 750, fontSize: 13.5 } }, secondary: { sx: { fontSize: 11.5 } } }} />{Number.isFinite(location.distanceKm) && <Chip label={`${location.distanceKm} km`} size="small" variant="outlined" />}</ListItemButton>;
            })}
            {!state.loading && displayedLocations.length === 0 && <Box sx={{ textAlign: "center", py: 7, px: 2 }}><DirectionsCarRoundedIcon sx={{ fontSize: 38, color: "text.disabled" }} /><Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{nearbyLocations ? "No vehicles were found within this radius." : "No vehicle locations have been reported."}</Typography></Box>}
          </List>
        </CardContent></Card>

        <Card sx={{ order: { xs: 1, lg: 2 }, overflow: "hidden", height: { xs: 480, lg: "auto" }, minHeight: 480 }}>
          <MapContainer center={defaultCenter} zoom={9} style={{ width: "100%", height: "100%" }} scrollWheelZoom>
            <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController locations={displayedLocations} focus={selectedLocation || searchCenter} />
            {displayedLocations.map((location) => <VehicleMarker key={location.id || location.vehicleId} location={location} vehicle={vehicleById.get(String(location.vehicleId))} selected={String(selectedVehicleId) === String(location.vehicleId)} onSelect={(id) => { setSelectedVehicleId(id); setSearchCenter(null); }} />)}
            {searchCenter && <CircleMarker center={[searchCenter.latitude, searchCenter.longitude]} radius={10} pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: "#D94A4A", fillOpacity: 1 }}><Popup>{searchCenter.label}</Popup></CircleMarker>}
          </MapContainer>
        </Card>
      </Box>
    </Box>
  );
}
