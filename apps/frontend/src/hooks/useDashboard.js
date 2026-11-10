import { useCallback, useEffect, useState } from "react";
import { loadDashboard } from "../api/dashboard-api.js";

export function useDashboard() {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setState((current) => ({ ...current, loading: true, error: null }));
    loadDashboard({ signal: controller.signal })
      .then((data) => setState({ data, loading: false, error: null }))
      .catch((error) => {
        if (error?.name !== "AbortError") setState({ data: null, loading: false, error });
      });
    return () => controller.abort();
  }, [refreshKey]);

  const refresh = useCallback(() => setRefreshKey((value) => value + 1), []);
  return { ...state, refresh };
}
