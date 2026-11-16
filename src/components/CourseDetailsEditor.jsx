import { useState } from "react";
import { FeaturedImageField } from "./FeaturedImageField.jsx";

const textFields = {
  title: "Title", slug: "Course slug", description: "Description",
};

export const CourseDetailsEditor = ({ course, track, categories, user, busy, onSave, onCancel }) => {
  const [form, setForm] = useState(() => ({
    ...Object.fromEntries(Object.keys(textFields).map((field) => [field, course[field] ?? ""])),
    ...(track && { title: track.title ?? "", description: track.description ?? course.description ?? "" }),
    categoryId: course.categoryId || "", sortOrder: course.sortOrder ?? 0,
    featuredImageResourceId: course.featuredImageResourceId ?? null,
    status: course.status || "draft", isFeatured: Boolean(course.isFeatured),
    isPublic: Boolean(course.isPublic),
  }));
  const [uploading, setUploading] = useState(false);
  const set = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const field = (name) => <label>{textFields[name]}
    {name === "description"
      ? <textarea rows={5} value={form[name]} onChange={(event) => set(name, event.target.value)} />
      : <input required={name === "title" || name === "slug"} maxLength={255} pattern={name === "slug" ? "[a-z0-9]+(-[a-z0-9]+)*" : undefined} value={form[name]} onChange={(event) => set(name, event.target.value)} />}
  </label>;
  return <form className="course-settings resource-form" onSubmit={(event) => {
    event.preventDefault();
    if (!busy && !uploading) onSave({ ...form, categoryId: form.categoryId || null, sortOrder: Number(form.sortOrder) });
  }}>
    <header><h2>Course settings</h2>{track && <p>Title and description apply to {track.mediumLabel || track.Medium?.name || "this medium"}. The other settings apply to the whole course.</p>}</header>
    <fieldset disabled={busy}><legend>General</legend>
      <div className="course-settings-grid">
    {field("title")}{field("slug")}
    <label>Course category<select value={form.categoryId} onChange={(event) => set("categoryId", event.target.value)}>
      <option value="">Uncategorized</option>{categories.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
    </select></label>
    <label>Display order<input type="number" min="0" max="2147483647" step="1" required value={form.sortOrder} onChange={(event) => set("sortOrder", event.target.value)} /></label>
      </div>
    </fieldset>
    <fieldset disabled={busy}><legend>Publication</legend>
    <div className="course-settings-grid">
    <label>Status<select value={form.status} onChange={(event) => {
      const status = event.target.value;
      setForm((current) => ({ ...current, status, isPublic: status === "published" }));
    }}>
      <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
    </select></label>
    <div className="course-settings-toggles">
      <label><input type="checkbox" checked={form.isPublic} disabled={form.status !== "published"} onChange={(event) => set("isPublic", event.target.checked)} /> Show in the public catalog</label>
      <label><input type="checkbox" checked={form.isFeatured} onChange={(event) => set("isFeatured", event.target.checked)} /> Featured course</label>
    </div>
    </div>
    <p>A language version must also be published to appear in the catalog.</p>
    </fieldset>
    <fieldset disabled={busy}><legend>Description</legend>
      {field("description")}
    </fieldset>
    <fieldset disabled={busy}><legend>Course image</legend>
    <FeaturedImageField value={form.featuredImageResourceId} onChange={(id) => set("featuredImageResourceId", id)} onUploading={setUploading} canUpload={user.permissions?.includes("resources.create")} busy={busy} />
    </fieldset>
    <footer className="course-settings-actions">
      <button className="course-settings-save" type="submit" disabled={busy || uploading}>{busy ? "Saving…" : "Save changes"}</button>
      <button type="button" disabled={busy || uploading} onClick={onCancel}>Cancel</button>
    </footer>
  </form>;
};
