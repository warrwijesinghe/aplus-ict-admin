import { useState } from "react";
import { api, unwrap } from "../api/client.js";

const logoSource = `${import.meta.env.BASE_URL}images/aplus-ict-logo.png`;

export const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    try {
      const result = unwrap(await api.post("/api/v1/auth/admin/login", { email, password }));
      localStorage.setItem("aplus_admin_token", result.accessToken);
      location.assign("/");
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Login failed");
    }
  };
  return <main className="login"><form onSubmit={submit}><img alt="A Plus ICT" className="login-logo" src={logoSource} /><p className="login-kicker">Learning management workspace</p><h1>Admin sign in</h1><input onChange={(event) => setEmail(event.target.value)} placeholder="Email" type="email" value={email} /><input onChange={(event) => setPassword(event.target.value)} placeholder="Password" type="password" value={password} /><button>Sign in</button>{error ? <p>{error}</p> : null}</form></main>;
};
