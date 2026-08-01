import React, { useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  NavLink,
  Route,
  Routes,
  Navigate,
} from "react-router-dom";
import { api, unwrap } from "./api.js";
import "./styles.css";
const pages = {
  Categories: "categories",
  Courses: "courses",
  Lessons: "lessons",
  Topics: "topics",
  "Learning content": "sections",
  Students: "students",
  Orders: "orders",
  Resources: "downloadable-resources",
};
const logoSource = `${import.meta.env.BASE_URL}images/aplus-ict-logo.png`;
const lightLogoSource = `${import.meta.env.BASE_URL}images/aplus-ict-logo-light.png`;
function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const submit = async (e) => {
    e.preventDefault();
    try {
      const result = unwrap(
        await api.post("/api/v1/auth/admin/login", { email, password }),
      );
      localStorage.setItem("aplus_admin_token", result.accessToken);
      location.assign("/");
    } catch (err) {
      setError(err.response?.data?.error?.message || "Login failed");
    }
  };
  return (
    <main className="login">
      <form onSubmit={submit}>
        <img alt="A Plus ICT" className="login-logo" src={logoSource} />
        <p className="login-kicker">Learning management workspace</p>
        <h1>Admin sign in</h1>
        <input
          placeholder="Email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          placeholder="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button>Sign in</button>
        {error && <p>{error}</p>}
      </form>
    </main>
  );
}
function GenericList({ title, path }) {
  const [rows, setRows] = useState([]),
    [error, setError] = useState("");
  useEffect(() => {
    api
      .get(`/api/v1/admin/${path}`)
      .then(unwrap)
      .then(setRows)
      .catch((e) =>
        setError(e.response?.data?.error?.message || "Unable to load"),
      );
  }, [path]);
  return (
    <section>
      <h2>{title}</h2>
      {error ? (
        <p>{error}</p>
      ) : (
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name / title</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.id}</td>
                <td>
                  {row.name ||
                    row.title ||
                    row.displayName ||
                    row.email ||
                    row.orderNumber}
                </td>
                <td>{row.status || row.category || row.role}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

const emptyResourceForm = () => ({
  title: "",
  description: "",
  resourceType: "syllabus",
  academicLevel: "al",
  medium: "sinhala",
  accessPolicy: "free",
  status: "published",
  sortOrder: "0",
  file: null,
});

// This focused form keeps public download publishing independent from lesson setup.
// Staff can add A/L, O/L, and future ICT materials without a code deployment.
function DownloadableResources() {
  const [rows, setRows] = useState([]);
  const [form, setForm] = useState(emptyResourceForm);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [fileInputKey, setFileInputKey] = useState(0);

  const loadRows = useCallback(async () => {
    setError("");
    try {
      setRows(unwrap(await api.get("/api/v1/admin/downloadable-resources")));
    } catch (loadError) {
      setError(
        loadError.response?.data?.error?.message || "Unable to load resources",
      );
    }
  }, []);

  useEffect(() => {
    loadRows();
  }, [loadRows]);

  const updateField = (event) => {
    const { name, value, files } = event.target;
    setForm((current) => ({
      ...current,
      [name]: files ? files[0] : value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    if (!form.file) {
      setError("Choose the PDF, Word, or PowerPoint file to publish.");
      return;
    }

    const body = new FormData();
    for (const [name, value] of Object.entries(form)) body.append(name, value);

    setError("");
    setIsSaving(true);
    try {
      await api.post("/api/v1/admin/downloadable-resources", body);
      setForm(emptyResourceForm());
      setFileInputKey((current) => current + 1);
      await loadRows();
    } catch (saveError) {
      setError(
        saveError.response?.data?.error?.message ||
          "Unable to publish the resource",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const changeStatus = async (id, status) => {
    setError("");
    try {
      await api.patch("/api/v1/admin/downloadable-resources/" + id, { status });
      await loadRows();
    } catch (saveError) {
      setError(
        saveError.response?.data?.error?.message ||
          "Unable to update the resource",
      );
    }
  };

  return (
    <section className="downloadable-resources">
      <div className="admin-page-heading">
        <div>
          <p className="admin-kicker">Public library</p>
          <h2>Downloadable resources</h2>
          <p>
            Publish free resources for everyone, or list paid resources that
            require a learner sign-in.
          </p>
        </div>
      </div>

      <form className="resource-form" onSubmit={submit}>
        <h3>Add a downloadable resource</h3>
        <label>
          Title
          <input
            name="title"
            onChange={updateField}
            required
            value={form.title}
          />
        </label>
        <label className="resource-description-field">
          Short description
          <textarea
            name="description"
            onChange={updateField}
            placeholder="What will the learner find in this file?"
            value={form.description}
          />
        </label>
        <label>
          Resource type
          <input
            list="resource-types"
            name="resourceType"
            onChange={updateField}
            value={form.resourceType}
          />
          <datalist id="resource-types">
            <option value="syllabus" />
            <option value="teachers_guide" />
            <option value="past_paper" />
            <option value="short_note" />
            <option value="mind_map" />
            <option value="term_paper" />
          </datalist>
        </label>
        <label>
          Level
          <select
            name="academicLevel"
            onChange={updateField}
            value={form.academicLevel}
          >
            <option value="al">A/L ICT</option>
            <option value="ol">O/L ICT</option>
          </select>
        </label>
        <label>
          Medium
          <select name="medium" onChange={updateField} value={form.medium}>
            <option value="sinhala">Sinhala</option>
            <option value="english">English</option>
            <option value="tamil">Tamil</option>
            <option value="all">All media</option>
          </select>
        </label>
        <label>
          Access
          <select
            name="accessPolicy"
            onChange={updateField}
            value={form.accessPolicy}
          >
            <option value="free">Free - no login</option>
            <option value="paid">Paid - learner sign-in</option>
          </select>
        </label>
        <label>
          Publish status
          <select name="status" onChange={updateField} value={form.status}>
            <option value="published">Published now</option>
            <option value="draft">Save as draft</option>
          </select>
        </label>
        <label>
          Sort order
          <input
            min="0"
            name="sortOrder"
            onChange={updateField}
            type="number"
            value={form.sortOrder}
          />
        </label>
        <label className="resource-file-field">
          File
          <input
            accept=".pdf,.doc,.docx,.ppt,.pptx"
            key={fileInputKey}
            name="file"
            onChange={updateField}
            required
            type="file"
          />
        </label>
        <button disabled={isSaving} type="submit">
          {isSaving ? "Publishing..." : "Add resource"}
        </button>
      </form>

      {error ? <p className="admin-error">{error}</p> : null}

      <div className="resource-table-wrap">
        <table>
          <thead>
            <tr>
              <th>Resource</th>
              <th>Level and medium</th>
              <th>Access</th>
              <th>File</th>
              <th>Publish status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>
                  <strong>{row.title}</strong>
                  <small>{row.resourceType}</small>
                </td>
                <td>
                  {row.academicLevel?.toUpperCase()} - {row.medium}
                </td>
                <td>{row.accessPolicy}</td>
                <td>{row.Resource?.originalFilename || "File unavailable"}</td>
                <td>
                  <select
                    aria-label={"Publish status for " + row.title}
                    onChange={(event) =>
                      changeStatus(row.id, event.target.value)
                    }
                    value={row.status}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length ? (
          <p className="resource-empty">
            No downloadable resources have been added yet.
          </p>
        ) : null}
      </div>
    </section>
  );
}

function List({ title, path }) {
  return path === "downloadable-resources" ? (
    <DownloadableResources />
  ) : (
    <GenericList path={path} title={title} />
  );
}

function Shell() {
  return (
    <div className="shell">
      <aside>
        <img alt="A Plus ICT" className="admin-logo" src={lightLogoSource} />
        <p className="admin-label">Management workspace</p>
        {Object.entries(pages).map(([name, path]) => (
          <NavLink key={path} to={`/${path}`}>
            {name}
          </NavLink>
        ))}
        <button
          onClick={() => {
            localStorage.removeItem("aplus_admin_token");
            location.assign("/login");
          }}
        >
          Sign out
        </button>
      </aside>
      <main>
        <Routes>
          {Object.entries(pages).map(([title, path]) => (
            <Route
              key={path}
              path={`/${path}`}
              element={<List title={title} path={path} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/categories" />} />
        </Routes>
      </main>
    </div>
  );
}
function App() {
  return localStorage.getItem("aplus_admin_token") ? <Shell /> : <Login />;
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
