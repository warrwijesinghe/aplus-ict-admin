import { useEffect, useState } from "react";
import { AdminShell } from "../layouts/AdminShell.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";
import { api, unwrap } from "../api/client.js";

export const App = () => {
  const [user, setUser] = useState(null); const token = localStorage.getItem("aplus_admin_token");
  useEffect(() => { if (token) api.get("/api/v1/auth/me").then(unwrap).then(setUser).catch(() => { localStorage.removeItem("aplus_admin_token"); setUser(false); }); }, [token]);
  if (!token) return <LoginPage />;
  if (user === false) return <LoginPage />;
  return user ? <AdminShell user={user} /> : <main className="login">Restoring session…</main>;
};
