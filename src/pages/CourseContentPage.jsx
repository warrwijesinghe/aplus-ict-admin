import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, unwrap } from "../api/client.js";
import { LessonSettings } from "../components/LessonSettings.jsx";
import { LessonPricing } from "../components/LessonPricing.jsx";
import { ResourcePicker } from "../components/ResourcePicker.jsx";

import { CourseDetailsEditor } from "../components/CourseDetailsEditor.jsx";
import { StudentsPage } from "./StudentManagementPage.jsx";
import "./course-workspace.css";

const nameOf = (item) => item?.title || item?.titleEn || item?.name || "Untitled";
const byOrder = (items) => [...items].sort((a, b) => a.sortOrder - b.sortOrder);
const resourceTypes = ["image", "pdf", "file", "download"];
const icons = { label: "¶", page: "▤", rich_text: "T", video: "▶", image: "▧", pdf: "PDF", file: "▤", download: "↓", external_link: "↗", embed: "<>", practical_activity: "✓", assignment: "□", quiz: "?" };

const blank = (kind, parent, type) => kind === "lesson"
  ? { trackId: parent, title: "New lesson", slug: "new-lesson", lessonNumber: 1, summary: "", status: "draft" }
  : kind === "topic"
    ? { lessonId: parent, title: "New topic", slug: "new-topic", status: "draft" }
    : { lessonId: parent.lessonId, topicId: parent.id, type, title: `New ${type.replaceAll("_", " ")}`, accessPolicy: "free", completionMode: "none", status: "draft", config: {} };

const Status = ({ value }) => <span className={`content-status ${value}`}>{value}</span>;
const isPublicContent = (item, now) => item.status === "published" && item.isVisible !== false &&
  (!item.availableFrom || new Date(item.availableFrom).getTime() <= now) &&
  (!item.availableUntil || new Date(item.availableUntil).getTime() >= now);

const emptyCourseFilters = { search: "", category: "", medium: "", status: "", availability: "" };

export const CoursesPage = () => {
  const [context, setContext] = useState(null);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState(emptyCourseFilters);
  const load = useCallback(() => {
    setError("");
    api.get("/api/v1/admin/content-builder/context").then(unwrap).then(setContext)
      .catch((requestError) => setError(requestError.response?.data?.error?.message || "Unable to load authorized courses."));
  }, []);
  useEffect(() => { load(); }, [load]);

  const categories = new Map((context?.categories || []).map(({ id, name }) => [id, name]));
  const levels = new Map((context?.academicLevels || []).map((level) => [level.id, level.nameEn || level.name || level.code]));
  const cards = (context?.media || []).map((track) => {
    const course = track.Course;
    const category = categories.get(course?.categoryId) || "Uncategorized";
    const medium = track.mediumLabel || nameOf(track.Medium);
    const status = track.status || "draft";
    const availability = status !== "published" || course?.status !== "published" || !track.isPublic || !course?.isPublic
      ? "Hidden" : track.availabilityStatus === "inactive" ? "Coming soon" : "Active";
    return { track, course, title: track.title || nameOf(course), category, medium, status, availability };
  });
  const visible = cards.filter(({ title, course, category, medium, status, availability }) =>
    (!filters.category || category === filters.category) &&
    (!filters.medium || medium === filters.medium) &&
    (!filters.status || status === filters.status) &&
    (!filters.availability || availability === filters.availability) &&
    `${title} ${nameOf(course)} ${medium}`.toLowerCase().includes(filters.search.trim().toLowerCase()));
  const change = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));
  const select = (key, label, values) => <label>{label}<select name={key} value={filters[key]} onChange={change}>
    <option value="">All</option>{[...new Set(values)].sort().map((value) => <option key={value}>{value}</option>)}
  </select></label>;

  return <section className="courses-page">
    <header className="admin-page-heading">
      <div><h1>Courses</h1><p>Choose a course medium to open its workspace.</p></div>
      <Link to="/courses/setup">Course setup</Link>
    </header>
    {error && <p className="admin-error" role="alert">{error} <button onClick={load} type="button">Retry</button></p>}
    {!context && !error && <p role="status">Loading courses…</p>}
    {context && <>
      <div className="course-grid-filters resource-form" role="group" aria-label="Course filters">
        <label>Search courses<input name="search" type="search" value={filters.search} onChange={change} placeholder="Search by title" /></label>
        {select("category", "Category", cards.map(({ category }) => category))}
        {select("medium", "Medium", cards.map(({ medium }) => medium))}
        {select("status", "Publication", cards.map(({ status }) => status))}
        {select("availability", "Availability", cards.map(({ availability }) => availability))}
        <button type="button" disabled={!Object.values(filters).some(Boolean)} onClick={() => setFilters(emptyCourseFilters)}>Clear filters</button>
      </div>
      <p className="course-grid-count" role="status">{visible.length} of {cards.length} course mediums</p>
      <div className="course-catalogue course-grid">
        {visible.map(({ track, course, title, category, medium, status, availability }) => <article key={track.id}>
          <p>{category}{levels.has(course?.academicLevelId) && ` · ${levels.get(course.academicLevelId)}`}</p>
          <h2>{title}</h2>
          <dl><div><dt>Medium</dt><dd>{medium}</dd></div><div><dt>Availability</dt><dd>{availability}</dd></div></dl>
          <footer><Status value={status} /><Link to={`/courses/${track.id}/content`} aria-label={`Open workspace for ${title}, ${medium}`}>Open workspace</Link></footer>
        </article>)}
      </div>
      {!visible.length && <p className="resource-empty">{cards.length ? "No courses match these filters." : "No course mediums are available."}</p>}
    </>}
  </section>;
};

export const CourseContentPage = ({ user }) => {
  const { courseTrackId, lessonId } = useParams(); const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const [collapsed, setCollapsed] = useState({});
  const [context, setContext] = useState(null); const [lessons, setLessons] = useState([]); const [topics, setTopics] = useState([]); const [activities, setActivities] = useState([]); const [types, setTypes] = useState([]);
  const [editMode, setEditMode] = useState(false); const [editor, setEditor] = useState(null); const [chooserTopic, setChooserTopic] = useState(null); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const editable = user.permissions?.some((permission) => ["lessons.create", "lessons.update", "topics.create", "topics.update", "activities.create", "activities.update"].includes(permission));
  const load = useCallback(async () => { try { setError(""); const [contextResponse, lessonResponse, topicResponse, activityResponse, typeResponse] = await Promise.all([api.get("/api/v1/admin/content-builder/context"), api.get("/api/v1/admin/lessons"), api.get("/api/v1/admin/topics"), api.get("/api/v1/admin/activities"), api.get("/api/v1/admin/activity-types")]); setContext(unwrap(contextResponse)); setLessons(unwrap(lessonResponse)); setTopics(unwrap(topicResponse)); setActivities(unwrap(activityResponse)); setTypes(unwrap(typeResponse)); } catch (requestError) { setError(requestError.response?.data?.error?.message || "You cannot open this course content."); } }, []);
  useEffect(() => { load(); }, [load]);
  const track = context?.media?.find((item) => item.id === courseTrackId); const course = context?.courses?.find((item) => item.id === track?.courseId); const level = context?.academicLevels?.find((item) => item.id === course?.academicLevelId);
  const courseLessons = useMemo(() => byOrder(lessons.filter((item) => item.trackId === courseTrackId && item.status !== "archived")), [lessons, courseTrackId]);
  const children = (items, field, id) => byOrder(items.filter((item) => item[field] === id && item.status !== "archived"));
  const startEditor = (kind, data, isNew = false) => {
    setError("");
    setEditor({ kind, isNew, data: { ...data, configText: JSON.stringify(data.config || {}, null, 2) } });
  };
  const addLesson = () => {
    const trackLessons = lessons.filter((lesson) => lesson.trackId === courseTrackId);
    const lessonNumber = Math.max(0, ...trackLessons.map((lesson) => Number(lesson.lessonNumber) || 0)) + 1;
    const sortOrder = Math.max(0, ...trackLessons.map((lesson) => Number(lesson.sortOrder) || 0)) + 1;
    const baseSlug = `lesson-${lessonNumber}`;
    let slug = baseSlug;
    for (let suffix = 2; trackLessons.some((lesson) => lesson.slug === slug); suffix++) slug = `${baseSlug}-${suffix}`;
    startEditor("lesson", { trackId: courseTrackId, title: "", slug, lessonNumber, sortOrder, summary: "", status: "draft" }, true);
  };
  const deleteLesson = async (lesson) => {
    if (!window.confirm(`Permanently delete ${nameOf(lesson)}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.delete(`/api/v1/admin/lessons/${lesson.id}`);
      setNotice("Lesson deleted.");
      navigate(`/courses/${courseTrackId}/content`);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Unable to delete the lesson.");
    } finally { setBusy(false); }
  };
  const create = async (kind, parent, type) => { try { setBusy(true); const path = kind === "activity" ? "activities" : `${kind}s`; const data = blank(kind, parent, type); const row = unwrap(await api.post(`/api/v1/admin/${path}`, data)); setChooserTopic(null); startEditor(kind, row, true); setNotice(`Draft ${kind} created.`); await load(); } catch (requestError) { setError(requestError.response?.data?.error?.message || `Unable to add ${kind}.`); } finally { setBusy(false); } };
  const save = async () => { if (!editor || busy) return; setBusy(true); setError(""); try { const data = { ...editor.data }; delete data.configText; if (editor.kind === "activity") { delete data.status; if (data.estimatedMinutes == null) delete data.estimatedMinutes; data.config = JSON.parse(editor.data.configText || "{}"); } const path = editor.kind === "activity" ? "activities" : `${editor.kind}s`; const row = unwrap(data.id ? await api.patch(`/api/v1/admin/${path}/${data.id}`, data) : await api.post(`/api/v1/admin/${path}`, data)); setEditor(null); setNotice(`${nameOf(row)} saved.`); await load(); } catch (requestError) { setError(requestError.response?.data?.error?.message || requestError.message || "Unable to save changes."); } finally { setBusy(false); } };
  const quickTitle = async (kind, item, title) => { if (!title.trim() || title === nameOf(item)) return; try { const path = kind === "activity" ? "activities" : `${kind}s`; await api.patch(`/api/v1/admin/${path}/${item.id}`, { title: title.trim() }); await load(); } catch (requestError) { await load(); setError(requestError.response?.data?.error?.message || "Title was not updated; the previous value was restored."); } };
  const action = async (kind, item, operation) => { if (operation === "archive" && !window.confirm(`Archive ${nameOf(item)}?`)) return; try { const path = kind === "activity" ? "activities" : `${kind}s`; if (operation === "duplicate") await api.post(`/api/v1/admin/${path}/${item.id}/duplicate`, kind === "topic" ? { includeActivities: true } : {}); else await api.post(`/api/v1/admin/${path}/${item.id}/${operation}`); setNotice(`${nameOf(item)} ${operation === "duplicate" ? "duplicated" : `${operation}d`}.`); await load(); } catch (requestError) { setError(requestError.response?.data?.error?.message || `Unable to ${operation}.`); } };
  const move = async (kind, parentId, item, direction) => { const source = kind === "lesson" ? courseLessons : kind === "topic" ? children(topics, "lessonId", parentId) : children(activities, "topicId", parentId); const index = source.findIndex((entry) => entry.id === item.id); if (index + direction < 0 || index + direction >= source.length) return; const order = [...source]; [order[index], order[index + direction]] = [order[index + direction], order[index]]; const endpoint = kind === "lesson" ? `/api/v1/admin/tracks/${courseTrackId}/lessons/reorder` : kind === "topic" ? `/api/v1/admin/lessons/${parentId}/topics/reorder` : `/api/v1/admin/topics/${parentId}/activities/reorder`; try { await api.patch(endpoint, { orderedIds: order.map((entry) => entry.id) }); await load(); } catch (requestError) { setError(requestError.response?.data?.error?.message || "Unable to reorder. Saved order was restored."); await load(); } };
  if (context && !track) return <section><p className="admin-error">You are not assigned to this Medium.</p><button onClick={() => navigate("/courses")} type="button">Back to courses</button></section>;
  if (!context && error) return <p role="alert" className="admin-error">{error} <button onClick={load} type="button">Retry</button></p>;
  if (!context) return <p className="resource-empty">Loading course content…</p>;
  const typeFor = (code) => types.find((item) => item.code === code);
  const allowed = (kind, permission) => kind !== "lesson" || user.permissions?.includes(`lessons.${permission}`);
  const menu = (kind, item, parentId) => <details className="content-menu"><summary aria-label={`Actions for ${nameOf(item)}`}>⋮</summary>{kind === "activity" && item.type === "quiz" ? <Link to={`/courses/${courseTrackId}/content/quiz/${item.id}`}>Open Quiz Builder</Link> : null}{kind !== "lesson" && allowed(kind, "update") && <button aria-label={`Edit ${nameOf(item)}`} onClick={() => startEditor(kind, item)} type="button">Edit</button>}{allowed(kind, "create") && <button aria-label={`Duplicate ${nameOf(item)}`} onClick={() => action(kind, item, "duplicate")} type="button">Duplicate</button>}{allowed(kind, "reorder") && <button aria-label={`Move ${nameOf(item)} up`} onClick={() => move(kind, parentId, item, -1)} type="button">Move up</button>}{allowed(kind, "reorder") && <button aria-label={`Move ${nameOf(item)} down`} onClick={() => move(kind, parentId, item, 1)} type="button">Move down</button>}{allowed(kind, "publish") && <button aria-label={`${item.status === "published" ? "Unpublish" : "Publish"} ${nameOf(item)}`} onClick={() => action(kind, item, item.status === "published" ? "unpublish" : "publish")} type="button">{item.status === "published" ? "Unpublish" : "Publish"}</button>}{allowed(kind, "publish") && <button aria-label={`Archive ${nameOf(item)}`} className="danger" onClick={() => action(kind, item, "archive")} type="button">Archive</button>} {kind === "lesson" && item.status === "draft" && allowed(kind, "publish") && <button className="danger" disabled={busy} onClick={() => deleteLesson(item)} type="button">Delete draft</button>}</details>;
  const editableTitle = (kind, item) => <input aria-label={`Title for ${nameOf(item)}`} className="inline-title" defaultValue={nameOf(item)} onKeyDown={(event) => { if (event.key === "Enter") quickTitle(kind, item, event.currentTarget.value); if (event.key === "Escape") event.currentTarget.value = nameOf(item); }} onBlur={(event) => quickTitle(kind, item, event.currentTarget.value)} />;
  const permissions = user.permissions || [];
  const coursePath = `/courses/${courseTrackId}/content`;
  const lessonPath = (id) => `/courses/${courseTrackId}/lessons/${id}`;
  const selectedLesson = courseLessons.find(({ id }) => id === lessonId);
  const quizzesOnly = !editMode && Number(selectedLesson?.lessonNumber) === 7 &&
    ["al-ict-english", "al-ict-sinhala"].includes(track?.slug);
  const outlineActivities = quizzesOnly ? activities.filter((activity) => activity.type === "quiz") : activities;
  const now = Date.now();
  const publicTopicIds = new Set(topics.filter((topic) => topic.lessonId === selectedLesson?.id && isPublicContent(topic, now)).map(({ id }) => id));
  const hasPublicActivities = selectedLesson && activities.some((activity) =>
    activity.lessonId === selectedLesson.id && isPublicContent(activity, now) && (!activity.topicId || publicTopicIds.has(activity.topicId)));
  const availabilityMessage = selectedLesson && (
    selectedLesson.status !== "published" ? "Publish this lesson to make it visible to students."
      : !isPublicContent(selectedLesson, now) ? "Check the lesson’s visibility and availability dates."
      : track.status !== "published" || track.isPublic === false || track.availabilityStatus === "inactive" || course?.status !== "published" || course?.isPublic === false
        ? "The course and its language medium must be published, public, and active."
        : !hasPublicActivities ? "The website shows Coming Soon until this lesson has a published, visible activity. If the activity is in a topic, publish that topic too."
          : null
  );
  const canReadParticipants = permissions.includes("students.read") && ["admin", "super_admin"].includes(user.role);
  const canEditSettings = permissions.includes(lessonId ? "lessons.update" : "courses.update");
  const tabs = [
    ["course", lessonId ? "Content" : "Lessons", true],
    ["settings", "Settings", canEditSettings || Boolean(lessonId && (permissions.includes("lessons.publish") || permissions.includes("products.view")))],
    ["participants", "Participants", canReadParticipants],
  ].filter(([, , allowed]) => allowed);
  const tab = tabs.find(([value]) => value === search.get("tab"))?.[0] || "course";
  const jumpTo = (topic) => {
    setCollapsed({});
    requestAnimationFrame(() => document.getElementById(`topic-${topic.id}`)?.scrollIntoView?.({ block: "start" }));
  };
  const saveSettings = async (values) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const { title, description, ...courseSettings } = values;
      await api.patch(`/api/v1/admin/tracks/${courseTrackId}/course-settings`, { title, description, course: courseSettings });
      await load();
      setNotice("Course settings saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Unable to save course settings.");
    } finally { setBusy(false); }
  };
  const saveLessonSettings = async (values) => {
    if (busy) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.patch(`/api/v1/admin/lessons/${selectedLesson.id}`, values);
      await load();
      setNotice("Lesson settings saved.");
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Unable to save lesson settings.");
    } finally { setBusy(false); }
  };
  const legacyLesson = search.get("lesson");
  if (!lessonId && legacyLesson && courseLessons.some(({ id }) => id === legacyLesson)) {
    return <Navigate replace to={lessonPath(legacyLesson) + (tab === "participants" ? "?tab=participants" : "")} />;
  }
  if (lessonId && !selectedLesson) return <section><p role="status">This lesson is unavailable.</p><Link to={coursePath}>Back to lessons</Link></section>;
  return <section className="course-content course-workspace">
    <header className="content-header">
      <div>
        <nav aria-label="Breadcrumb"><Link to="/courses/list">Courses</Link> / {selectedLesson ? <Link to={coursePath}>All lessons</Link> : <span>{nameOf(level)}</span>}</nav>
        <h1>{selectedLesson ? nameOf(selectedLesson) : `${nameOf(course)} — ${track.mediumLabel || track.Medium?.name || nameOf(track)}`}</h1>
        <div className="content-meta"><Status value={(selectedLesson || track).status || "draft"} /></div>
      </div>
      <div className="content-header-actions">{selectedLesson && tab === "course" && (editable ? <label className="edit-toggle">Edit mode <input aria-label="Edit mode" checked={editMode} onChange={(event) => setEditMode(event.target.checked)} type="checkbox" /><span>{editMode ? "ON" : "OFF"}</span></label> : null)}</div>
    </header>
    <nav className="workspace-tabs" aria-label="Course workspace">
      {tabs.map(([value, label]) => <button key={value} type="button" aria-current={tab === value ? "page" : undefined} onClick={() => setSearch(value === "course" ? {} : { tab: value })}>{label}</button>)}
    </nav>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="content-notice" role="status">{notice}</p>}
    {tab === "course" && !selectedLesson && <section className="course-outline" aria-label="Lessons">
      {permissions.includes("lessons.create") && <div className="lesson-list-toolbar"><button className="add-lesson" disabled={busy} onClick={addLesson} type="button">+ Add lesson</button></div>}
      {courseLessons.map((lesson) => <article className="lesson-list-row" key={lesson.id}>
        <div><span className="lesson-number">Lesson {lesson.lessonNumber || "—"}</span><h2>{nameOf(lesson)}</h2></div>
        <div className="item-controls"><Status value={lesson.status} />
          <Link to={lessonPath(lesson.id)}>Open lesson</Link>
          {permissions.includes("lessons.publish") && <button type="button" disabled={busy} onClick={() => action("lesson", lesson, "archive")}>Remove</button>}
        </div>
      </article>)}
      {!courseLessons.length && <p className="resource-empty">There are no lessons in this medium yet.</p>}
    </section>}
    {tab === "course" && selectedLesson && <>
      <div className="workspace-course-layout">
        <aside className="workspace-index"><details open>
          <summary>Lesson topics</summary>
          <nav aria-label="Lesson topics">
            {children(topics, "lessonId", selectedLesson.id).map((topic) => <button key={topic.id} type="button" onClick={() => jumpTo(topic)}>{nameOf(topic)}</button>)}
          </nav>
          {!children(topics, "lessonId", selectedLesson.id).length && <p>No topics yet.</p>}
        </details></aside>
        <div className="workspace-course-main">
        <div className="course-outline">{[selectedLesson].map((lesson) => <article className="lesson-section" id={`lesson-${lesson.id}`} key={lesson.id}><header><button className="workspace-chevron" type="button" aria-expanded={!collapsed[lesson.id]} aria-label={`${collapsed[lesson.id] ? "Expand" : "Collapse"} ${nameOf(lesson)}`} onClick={() => setCollapsed((current) => ({ ...current, [lesson.id]: !current[lesson.id] }))}>{collapsed[lesson.id] ? "›" : "⌄"}</button><div><p className="lesson-number">Lesson {lesson.lessonNumber || "—"}</p><h3>{nameOf(lesson)}</h3>{lesson.summary ? <p>{lesson.summary}</p> : null}</div><div className="item-controls"><Status value={lesson.status} /></div></header><div hidden={collapsed[lesson.id]}>{children(topics, "lessonId", lesson.id).map((topic) => <section className="topic-section" id={`topic-${topic.id}`} key={topic.id}><header><div>{editMode ? editableTitle("topic", topic) : <h4>{nameOf(topic)}</h4>}{topic.descriptionEn ? <p>{topic.descriptionEn}</p> : null}</div><div className="item-controls"><Status value={topic.status} />{editMode ? menu("topic", topic, lesson.id) : null}</div></header><div className="activity-list">{children(outlineActivities, "topicId", topic.id).map((activity) => <article className="activity-row" key={activity.id}><span className="activity-icon" aria-hidden="true">{icons[activity.type] || "•"}</span><div>{editMode ? editableTitle("activity", activity) : <h5>{nameOf(activity)}</h5>}<p>{typeFor(activity.type)?.name || activity.type.replaceAll("_", " ")}{activity.estimatedMinutes ? ` · ${activity.estimatedMinutes} min` : ""}</p></div><div className="activity-badges"><span>{activity.accessPolicy === "premium" ? "Premium" : "Free"}</span><Status value={activity.status} />{editMode ? menu("activity", activity, topic.id) : null}</div></article>)}</div>{editMode ? <button className="add-link" onClick={() => setChooserTopic({ ...topic, lessonId: lesson.id })} type="button">+ Add activity or resource</button> : null}</section>)}{editMode ? <button className="add-link" onClick={() => create("topic", lesson.id)} type="button">+ Add topic</button> : null}</div></article>)}</div>
        </div>
      </div>
    </>}
    {tab === "settings" && selectedLesson && <>
      {availabilityMessage && <section className="lesson-availability" aria-label="Student availability">
        <strong>Student availability</strong>
        <p>{availabilityMessage}</p>
        {!hasPublicActivities && <Link to={lessonPath(selectedLesson.id)}>Open lesson content</Link>}
      </section>}
      {permissions.includes("lessons.publish") && <section className="lesson-publication" aria-label="Lesson publication">
        <div><strong>Lesson publication</strong> <Status value={selectedLesson.status} /></div>
        <button type="button" onClick={() => action("lesson", selectedLesson, selectedLesson.status === "published" ? "unpublish" : "publish")}>
          {selectedLesson.status === "published" ? "Unpublish lesson" : "Publish lesson"}
        </button>
      </section>}
      {canEditSettings && <LessonSettings key={selectedLesson.id} lesson={selectedLesson} busy={busy} onSave={saveLessonSettings} actions={menu("lesson", selectedLesson, courseTrackId)} />}
      {permissions.includes("products.view") && <LessonPricing key={selectedLesson.id} lesson={selectedLesson} track={track} permissions={permissions} />}
    </>}
    {tab === "settings" && !selectedLesson && <CourseDetailsEditor key={track.id} course={course} track={track} categories={context.categories || []} user={user} busy={busy} onSave={saveSettings} onCancel={() => setSearch({})} />}
    {tab === "participants" && <>
      <StudentsPage key={selectedLesson?.id || courseTrackId} courseTrackId={courseTrackId} lessonId={selectedLesson?.id} lessonTitle={selectedLesson?.title} />
    </>}
    {chooserTopic ? <ActivityChooser types={types} onClose={() => setChooserTopic(null)} onSelect={(type) => create("activity", chooserTopic, type.code)} /> : null}{editor ? <Editor error={error} editor={editor} type={typeFor(editor.data.type)} busy={busy} onCancel={() => setEditor(null)} onChange={(name, value) => setEditor((current) => ({ ...current, data: { ...current.data, [name]: value } }))} onSave={save} /> : null}</section>;
};

const ActivityChooser = ({ types, onClose, onSelect }) => <div aria-modal="true" className="course-dialog" role="dialog"><div><header><h3>Add activity or resource</h3><button aria-label="Close activity chooser" onClick={onClose} type="button">×</button></header>{["Content and resources", "Learning activities"].map((group) => <section key={group}><h4>{group}</h4><div className="type-grid">{types.filter((type) => group === "Learning activities" ? ["practical_activity", "assignment", "quiz"].includes(type.code) : !["practical_activity", "assignment", "quiz"].includes(type.code)).map((type) => <button key={type.code} onClick={() => onSelect(type)} type="button"><strong>{icons[type.code] || "•"} {type.name}</strong><span>{type.description}</span>{type.status !== "active" ? <small>Draft-only</small> : null}</button>)}</div></section>)}</div></div>;

const Editor = ({ editor, type, busy, error, onCancel, onChange, onSave }) => { const activity = editor.kind === "activity"; const resource = resourceTypes.includes(editor.data.type); return <div aria-modal="true" className="course-dialog editor-dialog" role="dialog"><form onSubmit={(event) => { event.preventDefault(); onSave(); }}><header><div><p className="admin-kicker">{editor.isNew ? "New draft" : "Edit content"}</p><h3>{activity ? type?.name || "Learning activity" : editor.kind === "lesson" && !editor.data.id ? "Add lesson" : `Edit ${editor.kind}`}</h3></div><button aria-label="Close editor" onClick={onCancel} type="button">×</button></header>{error && <p role="alert" className="admin-error">{error}</p>}<label>Title<input autoFocus required maxLength={255} onChange={(event) => onChange("title", event.target.value)} value={editor.data.title || ""} /></label>{!activity ? <><label>Summary<textarea onChange={(event) => onChange(editor.kind === "lesson" ? "summary" : "descriptionEn", event.target.value)} value={editor.data.summary ?? editor.data.descriptionEn ?? ""} /></label>{editor.kind === "lesson" ? <><label>Lesson number<input required min="1" max="2147483647" onChange={(event) => onChange("lessonNumber", event.target.valueAsNumber || "")} type="number" value={editor.data.lessonNumber ?? ""} /></label>{!editor.data.id && <label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={255} value={editor.data.slug} onChange={(event) => onChange("slug", event.target.value)} /></label>}</> : null}</> : <><div className="form-pair"><label>Access<select onChange={(event) => onChange("accessPolicy", event.target.value)} value={editor.data.accessPolicy}><option value="free">Free</option><option value="premium">Premium</option></select></label><label>Completion<select onChange={(event) => onChange("completionMode", event.target.value)} value={editor.data.completionMode}>{type?.supportedCompletionModes?.map((mode) => <option key={mode} value={mode}>{mode}</option>)}</select></label></div>{["page", "rich_text", "label"].includes(editor.data.type) ? <label>Content<textarea onChange={(event) => onChange("content", event.target.value)} value={editor.data.content || ""} /></label> : null}{editor.data.type === "video" ? <label>YouTube URL<input onChange={(event) => onChange("youtubeUrl", event.target.value)} value={editor.data.youtubeUrl || ""} /></label> : null}{editor.data.type === "external_link" ? <label>External URL<input onChange={(event) => onChange("externalUrl", event.target.value)} value={editor.data.externalUrl || ""} /></label> : null}{["practical_activity", "assignment", "quiz"].includes(editor.data.type) ? <label>Instructions<textarea onChange={(event) => onChange("instructions", event.target.value)} value={editor.data.instructions || ""} /></label> : null}{resource ? <div><p>Selected resource: {editor.data.resourceId || "None"}</p><ResourcePicker allowedMimeTypes={editor.data.type === "image" ? ["image/"] : editor.data.type === "pdf" ? ["application/pdf"] : []} onSelect={(item) => onChange("resourceId", item.id)} /></div> : null}{["assignment", "quiz"].includes(editor.data.type) ? <p className="draft-shell">This is a draft-only shell until its dedicated task is implemented.</p> : null}<label>Advanced display settings (JSON)<textarea onChange={(event) => onChange("configText", event.target.value)} value={editor.data.configText || "{}"} /></label></>}<footer><button onClick={onCancel} type="button">Cancel</button><button disabled={busy} type="submit">{busy ? "Saving…" : "Save changes"}</button></footer></form></div>; };
