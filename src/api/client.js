import axios from "axios";

const configuredUrl = import.meta.env.VITE_API_URL || "http://localhost:4000";
// All request paths already begin with /api; accept both an origin and /api.
export const apiOrigin = (url) => url.replace(/\/api\/?$/, "");
export const api = axios.create({ baseURL: apiOrigin(configuredUrl), withCredentials: true });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aplus_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const unwrap = (response) => response.data.data;
