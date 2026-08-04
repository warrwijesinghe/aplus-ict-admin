import axios from "axios";

export const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || "http://localhost:4000", withCredentials: true });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("aplus_admin_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});
export const unwrap = (response) => response.data.data;
