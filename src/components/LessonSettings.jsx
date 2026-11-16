import { useState } from "react";
import { LessonLandingEditor } from "./LessonLandingEditor.jsx";
import { TutorialImagePicker } from "./TutorialImagePicker.jsx";

const toLocalDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
};

export const LessonSettings = ({ lesson, busy, onSave, actions }) => {
  const [form, setForm] = useState(() => ({
    title: lesson.title || "", slug: lesson.slug || "", lessonNumber: lesson.lessonNumber ?? "",
    summary: lesson.summary || "", estimatedPeriods: lesson.estimatedPeriods ?? "",
    estimatedMinutes: lesson.estimatedMinutes ?? "", isVisible: lesson.isVisible !== false,
    availableFrom: toLocalDateTime(lesson.availableFrom), availableUntil: toLocalDateTime(lesson.availableUntil),
    landingPageContent: lesson.landingPageContent || null, tutorialImageResourceId: lesson.tutorialImageResourceId || null,
  }));
  const change = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const input = (field, label, props) => <label>{label}<input {...props} value={form[field]} onChange={(event) => change(field, event.target.value)} /></label>;
  const optionalNumber = (value) => value === "" ? null : Number(value);
  const saveDate = (field) => form[field] === toLocalDateTime(lesson[field]) ? lesson[field] ?? null
    : form[field] ? new Date(form[field]).toISOString() : null;
  return <form className="resource-form course-settings" onSubmit={(event) => {
    event.preventDefault();
    onSave({
      ...form, lessonNumber: Number(form.lessonNumber),
      estimatedPeriods: optionalNumber(form.estimatedPeriods), estimatedMinutes: optionalNumber(form.estimatedMinutes),
      availableFrom: saveDate("availableFrom"), availableUntil: saveDate("availableUntil"),
    });
  }}>
    <header className="lesson-settings-header"><h2>Lesson settings</h2>{actions}</header>
    <fieldset disabled={busy}><legend>General</legend><div className="course-settings-grid">
      {input("title", "Title", { required: true, maxLength: 255 })}
      {input("slug", "URL slug", { required: true, maxLength: 255, pattern: "[a-z0-9]+(-[a-z0-9]+)*" })}
      {input("lessonNumber", "Lesson number", { type: "number", required: true, min: 1, max: 2147483647 })}
      {input("estimatedPeriods", "Recommended periods", { type: "number", min: 0, max: 2147483647 })}
      {input("estimatedMinutes", "Estimated minutes", { type: "number", min: 0, max: 2147483647 })}
      {input("availableFrom", "Available from", { type: "datetime-local" })}
      {input("availableUntil", "Available until", { type: "datetime-local" })}
      <div className="course-settings-toggles"><label><input type="checkbox" checked={form.isVisible} onChange={(event) => change("isVisible", event.target.checked)} /> Show when published</label></div>
    </div></fieldset>
    <fieldset disabled={busy}><legend>Public lesson page</legend>
      <label>Lesson card summary<textarea rows={4} value={form.summary} onChange={(event) => change("summary", event.target.value)} /></label>
      <LessonLandingEditor value={form.landingPageContent} onChange={(value) => change("landingPageContent", value)} />
    </fieldset>
    <fieldset disabled={busy}><legend>Printed tutorial image</legend>
      <TutorialImagePicker value={form.tutorialImageResourceId} onChange={(id) => change("tutorialImageResourceId", id)} />
    </fieldset>
    <footer className="course-settings-actions"><button className="course-settings-save" type="submit" disabled={busy}>{busy ? "Saving…" : "Save changes"}</button></footer>
  </form>;
};
