// Base URL for all API fetch calls.
// Set VITE_API_URL in .env.development for local dev, or in your deployment
// environment for production. Falls back to '' (empty string), which means
// requests use relative paths and are handled by the Vite dev proxy.
export const API_BASE = import.meta.env.VITE_API_URL ?? ''
