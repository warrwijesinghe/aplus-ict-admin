import { AdminShell } from "../layouts/AdminShell.jsx";
import { LoginPage } from "../auth/LoginPage.jsx";

export const App = () => localStorage.getItem("aplus_admin_token") ? <AdminShell /> : <LoginPage />;
