import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../api/client.js";
import { FeaturedImageField } from "../components/FeaturedImageField.jsx";

const path = "/api/v1/admin/categories";
const queryKey = ["admin", "course-categories"];
const empty = { name: "", slug: "", subtitle: "", description: "", status: "draft", sortOrder: 0, featuredImageResourceId: null };
const errorMessage = (error) => error?.response?.data?.error?.message || error?.message;

const CategoryForm = ({ category, busy, canUpload, onSave, onCancel }) => {
  const [form, setForm] = useState(() => Object.fromEntries(Object.entries(empty).map(([key, value]) => [key, category?.[key] ?? value])));
  const [uploading, setUploading] = useState(false);
  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  return <form className="resource-form" onSubmit={(event) => {
    event.preventDefault();
    onSave({ ...form, sortOrder: Number(form.sortOrder) });
  }}>
    <h2>{category?.id ? "Edit category" : "New category"}</h2>
    {input("name", "Name", { required: true, maxLength: 255 })}
    {input("slug", "URL slug", { required: true, pattern: "[a-z0-9]+(-[a-z0-9]+)*", maxLength: 255 })}
    {input("subtitle", "Subtitle", { maxLength: 255 })}
    <label>Description<textarea maxLength={10000} value={form.description} onChange={(event) => setField("description", event.target.value)} /></label>
    <label>Status<select value={form.status} onChange={(event) => setField("status", event.target.value)}>
      <option value="draft">Draft (Coming soon)</option><option value="published">Published</option><option value="archived">Archived (hidden)</option>
    </select></label>
    {input("sortOrder", "Display order", { type: "number", min: 0, max: 2147483647, step: 1, required: true })}
    <FeaturedImageField value={form.featuredImageResourceId} onChange={(id) => setField("featuredImageResourceId", id)} onUploading={setUploading} canUpload={canUpload} busy={busy} />
    <div><button type="submit" disabled={busy || uploading}>{busy ? "Saving…" : "Save category"}</button> <button type="button" disabled={busy || uploading} onClick={onCancel}>Cancel</button></div>
  </form>;
};

export const CourseCategoriesPage = ({ user }) => {
  const client = useQueryClient();
  const [editing, setEditing] = useState(null);
  const { data, isPending, error, refetch } = useQuery({ queryKey, queryFn: ({ signal }) => api.get(path, { signal }).then(unwrap) });
  const mutation = useMutation({
    mutationFn: ({ id, values }) => values ? (id ? api.patch(`${path}/${id}`, values) : api.post(path, values)) : api.delete(`${path}/${id}`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey });
      setEditing(null);
    },
  });
  const can = (action) => user.permissions?.includes(`courses.${action}`);
  const open = (category) => {
    mutation.reset();
    setEditing(category);
  };
  return <section>
    <h1>Course Categories</h1>
    {can("create") && <button type="button" disabled={mutation.isPending} onClick={() => open(empty)}>New category</button>}
    {error && <p role="alert">{errorMessage(error)} <button type="button" onClick={() => refetch()}>Retry</button></p>}
    {mutation.error && <p className="admin-error" role="alert">{errorMessage(mutation.error)}</p>}
    {editing && <CategoryForm key={editing.id || "new"} category={editing} busy={mutation.isPending} canUpload={user.permissions?.includes("resources.create")} onCancel={() => open(null)} onSave={(values) => mutation.mutate({ id: editing.id, values })} />}
    {isPending && <p role="status">Loading categories…</p>}
    {data && <div className="resource-table-wrap"><table>
      <thead><tr><th>Category</th><th>Slug</th><th>Status</th><th>Display order</th><th>Actions</th></tr></thead>
      <tbody>{data.map((category) => <tr key={category.id}>
        <td><strong>{category.name}</strong>{category.subtitle && <small>{category.subtitle}</small>}</td>
        <td>{category.slug}</td><td>{category.status}</td><td>{category.sortOrder}</td>
        <td>
          {can("update") && <button type="button" disabled={mutation.isPending} onClick={() => open(category)}>Edit</button>}
          {can("archive") && <button type="button" disabled={mutation.isPending} onClick={() => {
            if (window.confirm(`Delete ${category.name}?`)) mutation.mutate({ id: category.id });
          }}>Delete</button>}
        </td>
      </tr>)}</tbody>
    </table>{!data.length && <p>No course categories yet.</p>}</div>}
  </section>;
};
