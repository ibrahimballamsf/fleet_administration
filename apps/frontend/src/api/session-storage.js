const SESSION_KEY = "fleet.session";

export function readSession(storage = globalThis.localStorage) {
  try {
    const parsed = JSON.parse(storage.getItem(SESSION_KEY));
    return parsed?.token && parsed?.user ? parsed : null;
  } catch {
    return null;
  }
}

export function writeSession(session, storage = globalThis.localStorage) {
  storage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession(storage = globalThis.localStorage) {
  storage.removeItem(SESSION_KEY);
}

export { SESSION_KEY };
