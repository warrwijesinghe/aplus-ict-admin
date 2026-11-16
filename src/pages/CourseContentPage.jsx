import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api, apiOrigin, unwrap } from "../api/client.js";
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

const Chevron = ({ expanded }) => <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="19" height="19">
  <path d={expanded ? "m5 9 7 7 7-7" : "m9 5 7 7-7 7"} />
</svg>;

const ActivityIcon = ({ type }) => <span className="activity-icon" data-type={type} aria-hidden="true">
  {type === "quiz" || type === "assignment"
    ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><rect x="2" y="3" width="20" height="18" rx="2" /><path d="M6 8h6m-6 4h6m-6 4h6m3-8 1 1 2-2m-3 9 1 1 2-2" /></svg>
    : ["page", "rich_text", "file", "label"].includes(type)
      ? <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4"><path d="M6 2h8l5 5v13a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2Zm8 0v6h5M7 12h9m-9 4h9m-9 3h6" /></svg>
      : icons[type] || "•"}
</span>;

const AddContent = ({ label, onClick, disabled }) => <div className="workspace-insert">
  <button type="button" disabled={disabled} onClick={onClick}><span aria-hidden="true">+</span> {label}</button>
</div>;

const LessonCardCover = ({ imageIds, lessonNumber }) => {
  const [failed, setFailed] = useState([]);
  const current = imageIds.find((id) => !failed.includes(id));
  const origin = apiOrigin(import.meta.env.VITE_API_URL || "http://localhost:4000");
  return <div className="lesson-card-cover" aria-hidden="true">
    {current
      ? <img key={current} src={`${origin}/api/v1/resources/${encodeURIComponent(current)}/content`} alt=""
        loading="lazy" onError={() => setFailed((previous) => [...previous, current])} />
      : <ActivityIcon type="page" />}
    {lessonNumber != null && <span className="lesson-card-number">Lesson {lessonNumber}</span>}
  </div>;
};

const InlineTitle = ({ item, Heading: _Heading, onSave }) => {
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const title = nameOf(item);
  const finish = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    await onSave(draft);
    setSaving(false);
    setDraft(null);
  };
  return draft === null ? <div className="workspace-title">
    <_Heading>{title}</_Heading>
    <button type="button" className="workspace-pencil" aria-label={`Rename ${title}`} onClick={() => setDraft(title)}>✎</button>
  </div> : <form className="workspace-rename" onSubmit={finish} onKeyDown={(event) => {
    if (event.key === "Escape" && !saving) setDraft(null);
  }}>
    <input autoFocus required className="inline-title" aria-label={`Title for ${title}`} maxLength={255}
      value={draft} onChange={(event) => setDraft(event.target.value)} readOnly={saving} />
    <button type="submit" disabled={saving || !draft.trim()} aria-label="Save title">✓</button>
    <button type="button" disabled={saving} aria-label="Cancel rename" onClick={() => setDraft(null)}>×</button>
  </form>;
};

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

export const CourseContentPage = ({ user, headerActions }) => {
  const { courseTrackId, lessonId } = useParams(); const navigate = useNavigate();
  const [search, setSearch] = useSearchParams();
  const lessonHeading = useRef(null);
  useEffect(() => {
    if (lessonId) lessonHeading.current?.scrollIntoView?.({ block: "start" });
  }, [lessonId]);
  const [collapsed, setCollapsed] = useState({});
  const [indexClosed, setIndexClosed] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [context, setContext] = useState(null); const [lessons, setLessons] = useState([]); const [topics, setTopics] = useState([]); const [activities, setActivities] = useState([]); const [types, setTypes] = useState([]);
  const [editor, setEditor] = useState(null); const [chooserTopic, setChooserTopic] = useState(null); const [error, setError] = useState(""); const [notice, setNotice] = useState(""); const [busy, setBusy] = useState(false);
  const permissions = user.permissions || [];
  const editable = permissions.some((permission) => /^(lessons|topics|activities)\.(create|update|publish|reorder)$/.test(permission));
  const editMode = editable && search.get("edit") === "1";
  const workspaceQuery = (tab = "course", editing = editMode) => new URLSearchParams({
    ...(tab !== "course" && { tab }),
    ...(editing && { edit: "1" }),
  });
  const workspaceUrl = (path, query) => query.size ? `${path}?${query}` : path;
  const coursePath = workspaceUrl(`/courses/${courseTrackId}/content`, workspaceQuery());
  const lessonPath = (id, tab = "course", editing = editMode) =>
    workspaceUrl(`/courses/${courseTrackId}/lessons/${id}`, workspaceQuery(tab, editing));
  const quizPath = (id, parentLessonId) => {
    const query = workspaceQuery();
    if (parentLessonId) query.set("lesson", parentLessonId);
    return workspaceUrl(`/courses/${courseTrackId}/content/quiz/${id}`, query);
  };
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
  const addTopic = () => {
    const sortOrder = Math.max(0, ...topics.filter((topic) => topic.lessonId === lessonId).map((topic) => Number(topic.sortOrder) || 0)) + 1;
    startEditor("topic", { lessonId, title: "", sortOrder, status: "draft" }, true);
  };
  const addActivity = (type) => {
    const sortOrder = Math.max(0, ...activities.filter((activity) => activity.topicId === chooserTopic.id).map((activity) => Number(activity.sortOrder) || 0)) + 1;
    startEditor("activity", {
      lessonId, topicId: chooserTopic.id, type: type.code, title: "", sortOrder,
      accessPolicy: "free", completionMode: type.supportedCompletionModes?.[0] || "none",
      status: "draft", config: type.defaultConfig || {},
    }, true);
    setChooserTopic(null);
  };
  const deleteLesson = async (lesson) => {
    if (!window.confirm(`Permanently delete ${nameOf(lesson)}?`)) return;
    setBusy(true); setError(""); setNotice("");
    try {
      await api.delete(`/api/v1/admin/lessons/${lesson.id}`);
      setNotice("Lesson deleted.");
      navigate(coursePath);
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Unable to delete the lesson.");
    } finally { setBusy(false); }
  };
  const save = async () => {
    if (!editor || busy) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const { configText, ...data } = editor.data;
      data.title = data.title.trim();
      if (!data.title) throw new Error("Enter a title.");
      const path = editor.kind === "activity" ? "activities" : `${editor.kind}s`;
      if (editor.kind === "activity") {
        if (data.id) delete data.status;
        if (data.estimatedMinutes == null) delete data.estimatedMinutes;
        data.config = JSON.parse(configText || "{}");
      }
      const row = unwrap(data.id
        ? await api.patch(`/api/v1/admin/${path}/${data.id}`, data)
        : await api.post(`/api/v1/admin/${path}`, data));
      setEditor(null);
      setNotice(`${nameOf(row)} saved.`);
      if (editor.kind === "activity" && data.type === "quiz" && !data.id &&
        permissions.includes("quizzes.read") && permissions.includes("quizzes.create")) {
        navigate(quizPath(row.id, row.lessonId || data.lessonId));
        return;
      }
      if (editor.kind === "lesson" && !data.id) {
        setLessons((current) => [...current, row]);
        navigate(lessonPath(row.id, "course", true));
      }
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || requestError.message || "Unable to save changes.");
    } finally {
      setBusy(false);
    }
  };
  const quickTitle = async (kind, item, title) => {
    if (!title.trim() || title.trim() === nameOf(item)) return;
    setError("");
    try {
      const path = kind === "activity" ? "activities" : `${kind}s`;
      await api.patch(`/api/v1/admin/${path}/${item.id}`, { title: title.trim() });
      await load();
    } catch (requestError) {
      setError(requestError.response?.data?.error?.message || "Title was not updated.");
    }
  };
  const action = async (kind, item, operation) => { if (operation === "archive" && !window.confirm(`Archive ${nameOf(item)}?`)) return; try { const path = kind === "activity" ? "activities" : `${kind}s`; if (operation === "duplicate") await api.post(`/api/v1/admin/${path}/${item.id}/duplicate`, kind === "topic" ? { includeActivities: true } : {}); else await api.post(`/api/v1/admin/${path}/${item.id}/${operation}`); setNotice(`${nameOf(item)} ${operation === "duplicate" ? "duplicated" : `${operation}d`}.`); await load(); } catch (requestError) { setError(requestError.response?.data?.error?.message || `Unable to ${operation}.`); } };
  const move = async (kind, parentId, item, direction) => { const source = kind === "lesson" ? courseLessons : kind === "topic" ? children(topics, "lessonId", parentId) : children(activities, "topicId", parentId); const index = source.findIndex((entry) => entry.id === item.id); if (index + direction < 0 || index + direction >= source.length) return; const order = [...source]; [order[index], order[index + direction]] = [order[index + direction], order[index]]; const endpoint = kind === "lesson" ? `/api/v1/admin/tracks/${courseTrackId}/lessons/reorder` : kind === "topic" ? `/api/v1/admin/lessons/${parentId}/topics/reorder` : `/api/v1/admin/topics/${parentId}/activities/reorder`; try { await api.patch(endpoint, { orderedIds: order.map((entry) => entry.id) }); await load(); } catch (requestError) { setError(requestError.response?.data?.error?.message || "Unable to reorder. Saved order was restored."); await load(); } };
  if (context && !track) return <section><p className="admin-error">You are not assigned to this Medium.</p><button onClick={() => navigate("/courses")} type="button">Back to courses</button></section>;
  if (!context && error) return <p role="alert" className="admin-error">{error} <button onClick={load} type="button">Retry</button></p>;
  if (!context) return <p className="resource-empty">Loading course content…</p>;
  const typeFor = (code) => types.find((item) => item.code === code);
  const allowed = (kind, permission) => {
    const group = kind === "activity" ? "activities" : `${kind}s`;
    return permissions.includes(`${group}.${kind === "topic" && permission === "publish" ? "update" : permission}`);
  };
  const menu = (kind, item, parentId) => {
    const quiz = kind === "activity" && item.type === "quiz";
    const canEdit = allowed(kind, "update");
    const canDuplicate = allowed(kind, "create");
    const canReorder = Boolean(parentId) && allowed(kind, "reorder");
    const canPublish = allowed(kind, "publish");
    if (!quiz && !canEdit && !canDuplicate && !canReorder && !canPublish) return null;
    const publicationAction = item.status === "published" ? "Unpublish" : "Publish";
    return <details className="content-menu" onClick={(event) => {
      if (event.target.closest("button, a")) event.currentTarget.open = false;
    }}>
      <summary aria-label={`Actions for ${nameOf(item)}`}>⋮</summary>
      <div className="workspace-menu-items">
        {quiz && <Link to={quizPath(item.id, item.lessonId || lessonId)}>Open Quiz Builder</Link>}
        {canEdit && (kind === "lesson"
          ? <Link to={lessonPath(item.id, "settings")}>Edit settings</Link>
          : <button aria-label={`Edit ${nameOf(item)}`} onClick={() => startEditor(kind, item)} type="button">Edit settings</button>)}
        {canDuplicate && <button aria-label={`Duplicate ${nameOf(item)}`} onClick={() => action(kind, item, "duplicate")} type="button">Duplicate</button>}
        {canReorder && <>
          <button aria-label={`Move ${nameOf(item)} up`} onClick={() => move(kind, parentId, item, -1)} type="button">Move up</button>
          <button aria-label={`Move ${nameOf(item)} down`} onClick={() => move(kind, parentId, item, 1)} type="button">Move down</button>
        </>}
        {canPublish && <>
          {(!quiz || item.status === "published") && <button aria-label={`${publicationAction} ${nameOf(item)}`} onClick={() => action(kind, item, publicationAction.toLowerCase())} type="button">{publicationAction}</button>}
          <button aria-label={`Archive ${nameOf(item)}`} className="danger" onClick={() => action(kind, item, "archive")} type="button">Archive</button>
          {kind === "lesson" && item.status === "draft" && <button className="danger" disabled={busy} onClick={() => deleteLesson(item)} type="button">Delete draft</button>}
        </>}
      </div>
    </details>;
  };
  const titleFor = (kind, item, Heading) => editMode && allowed(kind, "update")
    ? <InlineTitle key={item.id} item={item} Heading={Heading} onSave={(title) => quickTitle(kind, item, title)} />
    : <Heading>{nameOf(item)}</Heading>;
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
  const lessonTopics = children(topics, "lessonId", lessonId);
  const generalActivities = byOrder(outlineActivities.filter((activity) => activity.lessonId === lessonId && !activity.topicId && activity.status !== "archived"));
  const generalKey = `general-${lessonId}`;
  const sectionKeys = [generalKey, ...lessonTopics.map(({ id }) => id)];
  const allCollapsed = sectionKeys.every((id) => collapsed[id]);
  const toggleSection = (id) => setCollapsed((current) => ({ ...current, [id]: !current[id] }));
  const jumpTo = (sectionId, targetId = sectionId) => {
    setCollapsed((current) => ({ ...current, [sectionId]: false }));
    setSelectedIndex(targetId);
    requestAnimationFrame(() => document.getElementById(`workspace-${targetId}`)?.scrollIntoView?.({ block: "nearest" }));
  };
  const indexButton = (sectionId, targetId, label, nested = false) => <button
    type="button" key={targetId} className={nested ? "workspace-index-child" : undefined}
    aria-current={(selectedIndex || generalKey) === targetId ? "location" : undefined}
    onClick={() => jumpTo(sectionId, targetId)} title={label}>
    {!nested && <Chevron expanded={!collapsed[sectionId]} />}<span>{label}</span>
  </button>;
  const activityRows = (rows, topicId) => rows.length > 0 && <div className="activity-list">
    {rows.map((activity) => <article className="activity-row" id={`workspace-${activity.id}`} key={activity.id}>
      <ActivityIcon type={activity.type} />
      <div>
        {titleFor("activity", activity, "h4")}
        <p>{typeFor(activity.type)?.name || activity.type.replaceAll("_", " ")}{activity.estimatedMinutes ? ` · ${activity.estimatedMinutes} min` : ""}</p>
      </div>
      <div className="activity-badges">
        <span>{activity.accessPolicy === "premium" ? "Premium" : "Free"}</span>
        {activity.status !== "published" && <Status value={activity.status} />}
        {editMode && menu("activity", activity, topicId)}
      </div>
    </article>)}
  </div>;
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
    return <Navigate replace to={lessonPath(legacyLesson, tab)} />;
  }
  if (lessonId && !selectedLesson) return <section><p role="status">This lesson is unavailable.</p><Link to={coursePath}>Back to lessons</Link></section>;
  const editToggle = tab === "course" && editable && <label className="edit-toggle workspace-edit-toggle">Edit mode
    <input aria-label="Edit mode" checked={editMode} onChange={(event) => setSearch(workspaceQuery(tab, event.target.checked), { replace: true })} type="checkbox" />
  </label>;
  return <section className={`course-content course-workspace${!selectedLesson ? " course-overview" : ""}${indexClosed || !selectedLesson ? " workspace-index-closed" : ""}`}>
    {headerActions && editToggle && createPortal(editToggle, headerActions)}
    {selectedLesson && !indexClosed && <aside className="workspace-index" id="workspace-index">
      <header>
        <button type="button" className="workspace-icon-button" aria-label="Close course index" onClick={() => setIndexClosed(true)}>×</button>
        <strong>Course index</strong>
      </header>
      <nav aria-label="Course index">
        {courseLessons.map((lesson) => <div className="workspace-index-lesson" key={lesson.id}>
          <Link to={lessonPath(lesson.id)} title={nameOf(lesson)} aria-current={lesson.id === lessonId ? "page" : undefined}>
            <span>{nameOf(lesson)}</span>
          </Link>
          {lesson.id === lessonId && tab === "course" && <div className="workspace-index-sections">
            {indexButton(generalKey, generalKey, "General")}
            {!collapsed[generalKey] && generalActivities.map((activity) => indexButton(generalKey, activity.id, nameOf(activity), true))}
            {lessonTopics.map((topic) => <div className="workspace-index-group" key={topic.id}>
              {indexButton(topic.id, topic.id, nameOf(topic))}
              {!collapsed[topic.id] && children(outlineActivities, "topicId", topic.id).map((activity) => indexButton(topic.id, activity.id, nameOf(activity), true))}
            </div>)}
          </div>}
        </div>)}
      </nav>
    </aside>}
    <div className="workspace-course-main">
    <header className="content-header">
      <div>
        <nav aria-label="Breadcrumb">
          {selectedLesson && indexClosed && <button type="button" className="workspace-icon-button" onClick={() => setIndexClosed(false)}>☰ Course index</button>}
          <Link to="/courses/list">Courses</Link>{selectedLesson ? <> / <Link to={coursePath}>All lessons</Link></> : level && <> / <span>{nameOf(level)}</span></>}
        </nav>
        <h1 ref={lessonHeading}>{selectedLesson ? nameOf(selectedLesson) : `${nameOf(course)} — ${track.mediumLabel || track.Medium?.name || nameOf(track)}`}</h1>
      </div>
      {!headerActions && editToggle}
    </header>
    <nav className="workspace-tabs" aria-label="Course workspace">
      {tabs.map(([value, label]) => <button key={value} type="button" aria-current={tab === value ? "page" : undefined} onClick={() => setSearch(workspaceQuery(value))}>{label}</button>)}
    </nav>
    {error && <p className="admin-error" role="alert">{error}</p>}
    {notice && <p className="content-notice" role="status">{notice}</p>}
    {tab === "course" && !selectedLesson && <section aria-label="Lessons">
      <div className="lesson-card-grid">
        {courseLessons.map((lesson) => {
          const imageIds = [...new Set([lesson.tutorialImageResourceId, course?.featuredImageResourceId, course?.tutorialImageResourceId].filter(Boolean))];
          return <article className="lesson-card" key={lesson.id}>
            <Link className="lesson-card-link" to={lessonPath(lesson.id)} aria-label={`Open ${nameOf(lesson)}`}>
              <LessonCardCover key={imageIds.join(",")} imageIds={imageIds} lessonNumber={lesson.lessonNumber} />
            </Link>
            <div className="lesson-card-body">
              {titleFor("lesson", lesson, "h2")}
              <footer>
                <Status value={lesson.status} />
                {editMode && menu("lesson", lesson, courseTrackId)}
                <span className="lesson-card-arrow" aria-hidden="true"><Chevron /></span>
              </footer>
            </div>
          </article>;
        })}
      </div>
      {!courseLessons.length && <p className="resource-empty">There are no lessons in this medium yet.</p>}
      {editMode && allowed("lesson", "create") && <AddContent label="Add lesson" disabled={busy} onClick={addLesson} />}
    </section>}
    {tab === "course" && selectedLesson && <div className="course-outline">
      <section className="workspace-section" id={`workspace-${generalKey}`}>
        <header>
          <button className="workspace-chevron" type="button" aria-expanded={!collapsed[generalKey]} aria-label={`${collapsed[generalKey] ? "Expand" : "Collapse"} General`} onClick={() => toggleSection(generalKey)}><Chevron expanded={!collapsed[generalKey]} /></button>
          <div className="workspace-title"><h2>General</h2>
            {editMode && allowed("lesson", "update") && <Link className="workspace-pencil" aria-label="Edit lesson settings" to={lessonPath(lessonId, "settings")}>✎</Link>}
          </div>
          <div className="item-controls">
            <button className="workspace-text-button" type="button" onClick={() => {
              setCollapsed((current) => ({ ...current, ...Object.fromEntries(sectionKeys.map((id) => [id, !allCollapsed])) }));
            }}>{allCollapsed ? "Expand all" : "Collapse all"}</button>
            <Status value={selectedLesson.status} />
            {editMode && menu("lesson", selectedLesson, courseTrackId)}
          </div>
        </header>
        {!collapsed[generalKey] && (selectedLesson.summary || generalActivities.length > 0) && <div className="workspace-section-body">
          {selectedLesson.summary && <p className="workspace-description">{selectedLesson.summary}</p>}
          {activityRows(generalActivities)}
        </div>}
      </section>
      {lessonTopics.map((topic) => <section className="workspace-section" id={`workspace-${topic.id}`} key={topic.id}>
        <header>
          <button className="workspace-chevron" type="button" aria-expanded={!collapsed[topic.id]} aria-label={`${collapsed[topic.id] ? "Expand" : "Collapse"} ${nameOf(topic)}`} onClick={() => toggleSection(topic.id)}><Chevron expanded={!collapsed[topic.id]} /></button>
          <div>{titleFor("topic", topic, "h2")}</div>
          <div className="item-controls">
            {topic.status !== "published" && <Status value={topic.status} />}
            {editMode && menu("topic", topic, lessonId)}
          </div>
        </header>
        {!collapsed[topic.id] && <div className="workspace-section-body">
          {topic.descriptionEn && <p className="workspace-description">{topic.descriptionEn}</p>}
          {activityRows(children(outlineActivities, "topicId", topic.id), topic.id)}
          {editMode && allowed("activity", "create") && <AddContent label="Add activity or resource" disabled={busy} onClick={() => setChooserTopic(topic)} />}
        </div>}
      </section>)}
      {editMode && allowed("topic", "create") && <AddContent label="Add topic" disabled={busy} onClick={addTopic} />}
    </div>}
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
    {tab === "settings" && !selectedLesson && <CourseDetailsEditor key={track.id} course={course} track={track} categories={context.categories || []} user={user} busy={busy} onSave={saveSettings} onCancel={() => setSearch(workspaceQuery())} />}
    {tab === "participants" && <>
      <StudentsPage key={selectedLesson?.id || courseTrackId} courseTrackId={courseTrackId} lessonId={selectedLesson?.id} lessonTitle={selectedLesson?.title} />
    </>}
    {chooserTopic ? <ActivityChooser types={types} onClose={() => setChooserTopic(null)} onSelect={addActivity} /> : null}{editor ? <Editor error={error} editor={editor} type={typeFor(editor.data.type)} busy={busy} onCancel={() => setEditor(null)} onChange={(name, value) => setEditor((current) => ({ ...current, data: { ...current.data, [name]: value } }))} onSave={save} /> : null}</div></section>;
};

const ContentDialog = ({ id, onClose, busy, children, className = "" }) => {
  const open = useCallback((dialog) => {
    if (!dialog || dialog.open) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.open = true;
  }, []);
  return <dialog ref={open} aria-labelledby={id} className={`course-dialog ${className}`} onCancel={(event) => {
    event.preventDefault();
    if (!busy) onClose();
  }}>{children}</dialog>;
};

const learningTypes = ["practical_activity", "assignment", "quiz"];

const ActivityChooser = ({ types, onClose, onSelect }) => <ContentDialog id="activity-chooser-title" onClose={onClose}>
  <div>
    <header>
      <h3 id="activity-chooser-title">Add activity or resource</h3>
      <button aria-label="Close activity chooser" onClick={onClose} type="button">×</button>
    </header>
    {["Content and resources", "Learning activities"].map((group, index) => <section key={group}>
      <h4>{group}</h4>
      <div className="type-grid">
        {types.filter((type) => learningTypes.includes(type.code) === Boolean(index)).map((type) => <button key={type.code} onClick={() => onSelect(type)} type="button">
          <ActivityIcon type={type.code} />
          <strong>{type.name}</strong>
          <span>{type.description}</span>
          {type.status !== "active" && <small>Draft-only</small>}
        </button>)}
      </div>
    </section>)}
  </div>
</ContentDialog>;

const Editor = ({ editor, type, busy, error, onCancel, onChange, onSave }) => {
  const { data, kind, isNew } = editor;
  const activity = kind === "activity";
  const title = activity ? type?.name || "Learning activity" : kind;
  const textField = (label, name) => <label>{label}
    <textarea value={data[name] || ""} onChange={(event) => onChange(name, event.target.value)} />
  </label>;

  return <ContentDialog id="content-editor-title" className="editor-dialog" onClose={onCancel} busy={busy}>
    <form onSubmit={(event) => { event.preventDefault(); onSave(); }}>
      <header>
        <h3 id="content-editor-title">{isNew ? "Add" : "Edit"} {title}</h3>
        <button aria-label="Close editor" onClick={onCancel} disabled={busy} type="button">×</button>
      </header>
      {error && <p role="alert" className="admin-error">{error}</p>}
      <label>Title<input autoFocus required maxLength={255} value={data.title || ""} onChange={(event) => onChange("title", event.target.value)} /></label>
      {!activity && <>
        {textField("Summary", kind === "lesson" ? "summary" : "descriptionEn")}
        {kind === "lesson" && <>
          <label>Lesson number<input required min="1" max="2147483647" type="number" value={data.lessonNumber ?? ""} onChange={(event) => onChange("lessonNumber", event.target.valueAsNumber || "")} /></label>
          {!data.id && <label>URL slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" maxLength={255} value={data.slug} onChange={(event) => onChange("slug", event.target.value)} /></label>}
        </>}
      </>}
      {activity && <>
        {["page", "rich_text", "label"].includes(data.type) && textField("Content", "content")}
        {data.type === "video" && <label>YouTube URL<input value={data.youtubeUrl || ""} onChange={(event) => onChange("youtubeUrl", event.target.value)} /></label>}
        {data.type === "external_link" && <label>External URL<input value={data.externalUrl || ""} onChange={(event) => onChange("externalUrl", event.target.value)} /></label>}
        {learningTypes.includes(data.type) && textField("Instructions", "instructions")}
        {resourceTypes.includes(data.type) && <div>
          <p>Selected resource: {data.resourceId || "None"}</p>
          <ResourcePicker allowedMimeTypes={data.type === "image" ? ["image/"] : data.type === "pdf" ? ["application/pdf"] : []} onSelect={(item) => onChange("resourceId", item.id)} />
        </div>}
        <div className="form-pair">
          <label>Access<select value={data.accessPolicy} onChange={(event) => onChange("accessPolicy", event.target.value)}>
            <option value="free">Free</option><option value="premium">Premium</option>
          </select></label>
          <label>Completion<select value={data.completionMode} onChange={(event) => onChange("completionMode", event.target.value)}>
            {type?.supportedCompletionModes?.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
          </select></label>
        </div>
        <details className="editor-advanced">
          <summary>Advanced display settings</summary>
          {textField("Display settings (JSON)", "configText")}
        </details>
      </>}
      <footer>
        <button disabled={busy} onClick={onCancel} type="button">Cancel</button>
        <button disabled={busy} type="submit">{busy ? "Saving…" : "Save changes"}</button>
      </footer>
    </form>
  </ContentDialog>;
};
