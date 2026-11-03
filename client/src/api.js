import { useSyncExternalStore } from "react";

export const API_BASE_URL = (
  import.meta.env.VITE_API_URL || "/api"
).replace(/\/$/, "");

const RETRY_DELAY_MS = 3000;
const RETRY_WINDOW_MS = 90_000;
let apiStatus = "connecting";
let connectionPromise;
const statusListeners = new Set();

function updateApiStatus(status) {
  apiStatus = status;
  statusListeners.forEach((listener) => listener());
}

function subscribeToApiStatus(listener) {
  statusListeners.add(listener);
  return () => statusListeners.delete(listener);
}

export function useApiStatus() {
  return useSyncExternalStore(subscribeToApiStatus, () => apiStatus);
}

export function ensureApiReady({ force = false } = {}) {
  if (!force && apiStatus === "ready") return Promise.resolve(true);
  if (connectionPromise) return connectionPromise;

  updateApiStatus("connecting");
  connectionPromise = (async () => {
    const startedAt = Date.now();
    while (Date.now() - startedAt < RETRY_WINDOW_MS) {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) throw new Error(`Health check returned ${response.status}.`);
        updateApiStatus("ready");
        return true;
      } catch {
        const remaining = RETRY_WINDOW_MS - (Date.now() - startedAt);
        if (remaining <= 0) break;
        await new Promise((resolve) => window.setTimeout(resolve, Math.min(RETRY_DELAY_MS, remaining)));
      }
    }

    updateApiStatus("unavailable");
    return false;
  })().finally(() => {
    connectionPromise = undefined;
  });
  return connectionPromise;
}

export function startApiWakeup() {
  return ensureApiReady();
}

export function retryApiConnection() {
  return ensureApiReady({ force: true });
}

async function sendRequest(path, options) {
  let response;
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      headers: { "Content-Type": "application/json", ...options.headers },
      credentials: "include",
      ...options,
    });
  } catch {
    const error = new Error("Cannot reach Nomad Travels right now.");
    error.retryable = true;
    throw error;
  }

  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(result.message || "The request could not be completed.");
    error.retryable = response.status >= 500 || response.status === 408 || response.status === 429;
    throw error;
  }
  return result;
}

async function request(path, options = {}, { onRetry } = {}) {
  const canRetry = (options.method || "GET").toUpperCase() === "GET";
  const startedAt = Date.now();

  while (true) {
    try {
      return await sendRequest(path, options);
    } catch (error) {
      const elapsed = Date.now() - startedAt;
      if (!canRetry || !error.retryable || elapsed >= RETRY_WINDOW_MS) {
        if (canRetry && error.retryable && elapsed >= RETRY_WINDOW_MS) {
          throw new Error("Our server is taking longer than usual to wake up. Please try again.");
        }
        throw error;
      }

      await new Promise((resolve) => window.setTimeout(resolve, RETRY_DELAY_MS));
      onRetry?.(Date.now() - startedAt);
    }
  }
}

export function getPackages(options = {}) {
  return request("/packages", {}, options);
}

export function getHomepageContent(options = {}) {
  return request("/packages/homepage", {}, options);
}

export function getPublicReviews(options = {}) {
  return request("/reviews", {}, options);
}

export function submitReview(review) {
  return request("/reviews", {
    method: "POST",
    body: JSON.stringify(review),
  });
}

export function createInquiry(inquiry) {
  return request("/inquiries", {
    method: "POST",
    body: JSON.stringify(inquiry),
  });
}

export function adminRequest(path, options = {}, retryOptions = {}) {
  return request(`/admin${path}`, options, retryOptions);
}
