import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), delete: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ api, apiOrigin: (url) => url.replace(/\/api\/?$/, ""), unwrap: (response) => response.data.data }));
import { AdminShell } from "../src/layouts/AdminShell.jsx";
import { CourseContentPage } from "../src/pages/CourseContentPage.jsx";

const response = (data) => ({ data: { data } });
const level = { id: "level-1", name: "A/L" };
const course = { id: "course-1", academicLevelId: "level-1", title: "ICT", featuredImageResourceId: "course-cover" };
const medium = { id: "track-1", courseId: "course-1", title: "Sinhala", mediumLabel: "Sinhala", status: "published" };
const lesson = { id: "lesson-1", slug: "introduction", trackId: "track-1", title: "Introduction", lessonNumber: 1, sortOrder: 1, status: "draft", tutorialImageResourceId: "lesson-cover" };
const secondLesson = { id: "lesson-2", trackId: "track-1", title: "Networks", lessonNumber: 2, sortOrder: 2, status: "draft" };
const topic = { id: "topic-1", lessonId: "lesson-1", title: "Hardware", sortOrder: 1, status: "published" };
const activity = { id: "activity-1", lessonId: "lesson-1", topicId: "topic-1", title: "Watch", type: "video", accessPolicy: "premium", completionMode: "view", estimatedMinutes: null, sortOrder: 1, status: "draft", config: {} };
const videoType = { code: "video", name: "Video", description: "Video lesson", status: "active", supportedCompletionModes: ["none", "view"], defaultConfig: {} };
const labelType = { code: "label", name: "Label", description: "Short label", status: "active", supportedCompletionModes: ["none"], defaultConfig: {} };
const user = { name: "Editor", role: "content_editor", permissions: ["tracks.read", "lessons.read", "lessons.create", "lessons.update", "lessons.reorder", "topics.read", "topics.create", "topics.update", "activities.read", "activities.create", "activities.update"] };
const loadMocks = () => api.get.mockImplementation((url) => {
  if (url.endsWith("/students")) return Promise.resolve(response({ items: [], pagination: { total: 0 } }));
  if (url.endsWith("/context")) return Promise.resolve(response({ academicLevels: [level], courses: [course], media: [medium] }));
  if (url.endsWith("/lessons")) return Promise.resolve(response([lesson, secondLesson]));
  if (url.endsWith("/topics")) return Promise.resolve(response([topic]));
  if (url.endsWith("/activities")) return Promise.resolve(response([activity]));
  return Promise.resolve(response([videoType, labelType]));
});
const renderContent = (props = {}, suffix = "/lessons/lesson-1") => render(<MemoryRouter initialEntries={[`/courses/track-1${suffix || "/content"}`]}><Routes><Route element={<CourseContentPage user={{ ...user, ...props }} />} path="/courses/:courseTrackId/content" /><Route element={<CourseContentPage user={{ ...user, ...props }} />} path="/courses/:courseTrackId/lessons/:lessonId" /></Routes></MemoryRouter>);

describe("Course content edit mode", () => {
  beforeEach(() => { api.get.mockReset(); api.post.mockReset(); api.patch.mockReset(); api.delete.mockReset(); loadMocks(); });
  it.each([
    ["topics", { ...topic, status: "archived" }],
    ["activities", { ...activity, status: "archived" }],
  ])("confirms permanent deletion of archived %s and refreshes the lesson", async (path, item) => {
    const defaults = api.get.getMockImplementation();
    let deleted = false;
    api.get.mockImplementation((url) => url.endsWith(`/${path}`)
      ? Promise.resolve(response(deleted ? [] : [item]))
      : defaults(url));
    api.delete.mockImplementationOnce(async () => { deleted = true; });
    const confirm = vi.spyOn(window, "confirm").mockReturnValueOnce(false).mockReturnValueOnce(true);
    try {
      renderContent({ permissions: [...user.permissions, "activities.publish"] });
      fireEvent.click(await screen.findByLabelText("Edit mode"));
      fireEvent.click(screen.getByText("Archived topics and activities (1)"));
      const button = screen.getByRole("button", { name: `Delete ${item.title} permanently` });
      fireEvent.click(button);
      expect(api.delete).not.toHaveBeenCalled();
      fireEvent.click(button);
      await waitFor(() => expect(api.delete).toHaveBeenCalledWith(`/api/v1/admin/${path}/${item.id}`));
      await waitFor(() => expect(screen.queryByText("Archived topics and activities (1)")).not.toBeInTheDocument());
    } finally {
      confirm.mockRestore();
    }
  });
  it("restores an archived lesson to the card list even when it has no topics", async () => {
    const defaults = api.get.getMockImplementation();
    let status = "archived";
    api.get.mockImplementation((url) => {
      if (url.endsWith("/lessons")) return Promise.resolve(response([{ ...lesson, status }, secondLesson]));
      if (url.endsWith("/topics")) return Promise.resolve(response([]));
      return defaults(url);
    });
    api.post.mockImplementationOnce(async () => {
      status = "draft";
      return response({ ...lesson, status });
    });
    renderContent({ permissions: [...user.permissions, "lessons.publish"] }, "");
    fireEvent.click(await screen.findByText("Archived lessons (1)"));
    expect(screen.queryByRole("link", { name: "Open Introduction" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Restore Introduction as draft" }));
    expect(await screen.findByRole("link", { name: "Open Introduction" })).toBeInTheDocument();
    expect(api.post).toHaveBeenCalledWith("/api/v1/admin/lessons/lesson-1/restore");
  });
  it("shows lesson cards with lesson or course covers and opens the existing lesson editor", async () => {
    renderContent({}, "");
    const firstLesson = await screen.findByRole("link", { name: "Open Introduction" });
    expect(firstLesson.querySelector("img")).toHaveAttribute("src", expect.stringContaining("/resources/lesson-cover/content"));
    expect(screen.getByRole("link", { name: "Open Networks" }).querySelector("img"))
      .toHaveAttribute("src", expect.stringContaining("/resources/course-cover/content"));
    fireEvent.error(firstLesson.querySelector("img"));
    expect(firstLesson.querySelector("img")).toHaveAttribute("src", expect.stringContaining("/resources/course-cover/content"));
    fireEvent.error(firstLesson.querySelector("img"));
    expect(firstLesson.querySelector("img")).toHaveAttribute("src", "/images/learning-places/student-guide-learning.webp");
    expect(screen.queryByText("Premium")).not.toBeInTheDocument();
    fireEvent.click(firstLesson);
    expect(screen.getByRole("heading", { name: "Hardware" })).toBeInTheDocument();
  });
  it("keeps the selected lesson and edit mode when switching tabs and returning from Quiz Builder", async () => {
    const quizActivity = { ...activity, type: "quiz", title: "Hardware quiz" };
    const quiz = { id: "quiz-1", lessonId: lesson.id, title: quizActivity.title, status: "draft" };
    const defaults = api.get.getMockImplementation();
    api.get.mockImplementation((url) => {
      if (url.endsWith("/activities")) return Promise.resolve(response([quizActivity]));
      if (url.endsWith("/quizzes")) return Promise.resolve(response(quiz));
      if (url.endsWith("/questions")) return Promise.resolve(response({ items: [] }));
      if (url.endsWith("/random-rules")) return Promise.resolve(response([]));
      return defaults(url);
    });
    render(<MemoryRouter initialEntries={["/courses/track-1/lessons/lesson-1"]}>
      <AdminShell user={{ ...user, role: "admin" }} />
    </MemoryRouter>);
    fireEvent.click(await screen.findByLabelText("Edit mode"));
    fireEvent.click(screen.getByRole("button", { name: "Settings" }));
    expect(screen.getByRole("heading", { name: "Introduction", level: 1 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Content" }));
    expect(screen.getByLabelText("Edit mode")).toBeChecked();
    fireEvent.click(screen.getByLabelText("Actions for Hardware quiz"));
    fireEvent.click(screen.getByRole("link", { name: "Open Quiz Builder" }));
    fireEvent.click(await screen.findByRole("link", { name: "Back to lesson" }));
    expect(await screen.findByRole("heading", { name: "Introduction", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Edit mode")).toBeChecked();
    expect(screen.getByRole("navigation", { name: "Lesson outline" })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Networks" })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: "All courses" })).toHaveAttribute("href", "/courses/list");
    fireEvent.click(screen.getByRole("link", { name: "All lessons" }));
    fireEvent.click(screen.getByRole("link", { name: "Open Networks" }));
    expect(screen.getByRole("heading", { name: "Networks", level: 1 })).toBeInTheDocument();
    expect(screen.getByLabelText("Edit mode")).toBeChecked();
  });
  it("collapses and reopens topics and the lesson outline", async () => {
    renderContent();
    const outline = within(await screen.findByRole("navigation", { name: "Lesson outline" }));
    expect(outline.getByRole("button", { name: "Watch" })).toBeVisible();
    fireEvent.click(outline.getByRole("button", { name: "Collapse Hardware in lesson outline" }));
    expect(outline.queryByRole("button", { name: "Watch" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Watch" })).not.toBeInTheDocument();
    fireEvent.click(outline.getByRole("button", { name: "Expand Hardware in lesson outline" }));
    expect(outline.getByRole("button", { name: "Watch" })).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Close lesson outline" }));
    expect(screen.queryByRole("navigation", { name: "Lesson outline" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Open lesson outline" }));
    expect(screen.getByRole("navigation", { name: "Lesson outline" })).toBeVisible();
  });
  it("groups numbered topics under their parent in the editor and outline", async () => {
    const defaults = api.get.getMockImplementation();
    const numberedTopics = ["1 Foundations", "1.1 Data", "1.1.1 Formats", "2 Applications", "3.1 Standalone"].map(
      (title, index) => ({ ...topic, id: `numbered-${index}`, title, sortOrder: index }),
    );
    api.get.mockImplementation((url) => url.endsWith("/topics") ? Promise.resolve(response(numberedTopics)) : defaults(url));
    const { container } = renderContent();
    await screen.findByRole("heading", { name: "1 Foundations" });
    const parent = within(container.querySelector("#workspace-numbered-0"));
    expect(parent.getByRole("heading", { name: "1.1 Data", level: 3 })).toBeVisible();
    expect(parent.getByRole("heading", { name: "1.1.1 Formats", level: 4 })).toBeVisible();
    expect(screen.getByRole("heading", { name: "3.1 Standalone", level: 2 })).toBeVisible();
    const outline = within(screen.getByRole("navigation", { name: "Lesson outline" }));
    fireEvent.click(outline.getByRole("button", { name: "Collapse 1 Foundations in lesson outline" }));
    expect(outline.queryByRole("button", { name: "1.1 Data" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "1.1 Data" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2 Applications" })).toBeVisible();
  });
  it("creates a subtopic with the next number under its selected parent", async () => {
    const defaults = api.get.getMockImplementation();
    const parent = { ...topic, id: "parent", title: "1 Foundations" };
    const child = { ...topic, id: "child", title: "1.1 Existing topic", sortOrder: 2 };
    const saved = { ...topic, id: "saved", title: "1.2 New topic", sortOrder: 3, status: "draft" };
    const rows = [parent, child];
    api.get.mockImplementation((url) => url.endsWith("/topics") ? Promise.resolve(response(rows)) : defaults(url));
    api.post.mockImplementationOnce(async () => { rows.push(saved); return response(saved); });
    const { container } = renderContent({}, "/lessons/lesson-1?edit=1");
    fireEvent.click(await screen.findByRole("button", { name: "Add subtopic to 1 Foundations" }));
    const form = within(screen.getByRole("dialog", { name: "Add subtopic 1.2" }));
    fireEvent.change(form.getByLabelText("Title"), { target: { value: "New topic" } });
    fireEvent.click(form.getByRole("button", { name: "Save changes" }));
    expect(await within(container.querySelector("#workspace-parent")).findByRole("heading", { name: "1.2 New topic", level: 3 })).toBeVisible();
    expect(api.post).toHaveBeenCalledWith("/api/v1/admin/topics", expect.objectContaining({ lessonId: lesson.id, title: "1.2 New topic", status: "draft" }));
  });
  it("uploads the topic CSV to the selected lesson and reports the result", async () => {
    api.post.mockResolvedValueOnce(response({ imported: 1, skipped: 0 }));
    renderContent({}, "/lessons/lesson-1?edit=1");
    fireEvent.click(await screen.findByRole("button", { name: "Import topics" }));
    const dialog = within(screen.getByRole("dialog", { name: "Import lesson topics" }));
    expect(dialog.getByRole("link", { name: "Download CSV template" })).toHaveAttribute("download", "lesson-topics-template.csv");
    const contents = "title\nNetworking";
    const file = new File([contents], "topics.csv");
    file.arrayBuffer = async () => new TextEncoder().encode(contents).buffer;
    fireEvent.change(dialog.getByLabelText("Topic list file"), { target: { files: [file] } });
    const submit = dialog.getByRole("button", { name: "Import topics" });
    expect(submit).toBeEnabled();
    fireEvent.submit(submit.form);
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/admin/lessons/lesson-1/topics/import", { text: contents }));
    expect(await screen.findByText("Added 1 topic as a draft.")).toBeInTheDocument();
  });
  it("creates a lesson only when the Add lesson form is saved", async () => {
    api.post.mockResolvedValueOnce(response({ ...lesson, id: "lesson-3", title: "New lesson title" }));
    renderContent({}, "");
    fireEvent.click(await screen.findByLabelText("Edit mode"));
    fireEvent.click(screen.getByRole("button", { name: "Add lesson" }));
    expect(api.post).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText("Title", { exact: true }), { target: { value: "New lesson title" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/admin/lessons", expect.objectContaining({
      trackId: "track-1", title: "New lesson title", lessonNumber: 3, slug: "lesson-3", status: "draft",
    })));
  });
  it("scopes participants to the selected medium", async () => {
    renderContent({ role: "admin", permissions: [...user.permissions, "students.read"] });
    fireEvent.click(await screen.findByRole("button", { name: "Participants" }));
    expect(screen.getByRole("heading", { name: "Participants · Introduction" })).toBeInTheDocument();
    await waitFor(() => expect(api.get).toHaveBeenCalledWith("/api/v1/admin/students", { params: expect.objectContaining({ courseTrackId: "track-1", lessonId: "lesson-1" }) }));
  });
  it("saves landing page content independently from LMS topics", async () => {
    api.get.mockImplementationOnce(() => Promise.resolve(response({ academicLevels: [level], courses: [course], media: [medium] })));
    api.get.mockImplementationOnce(() => Promise.resolve(response([{ ...lesson, summary: "Saved lesson summary", landingPageContent: { overview: "Saved public overview" } }, secondLesson])));
    api.patch.mockResolvedValueOnce(response(lesson));
    renderContent();
    fireEvent.click(await screen.findByRole("button", { name: "Settings" }));
    expect(screen.getByLabelText("Lesson card summary")).toHaveValue("Saved lesson summary");
    expect(screen.getByLabelText("Lesson overview")).toHaveValue("Saved public overview");
    fireEvent.change(screen.getByLabelText("Lesson overview"), { target: { value: "Public lesson description" } });
    fireEvent.click(screen.getByRole("button", { name: "+ Add landing page content" }));
    fireEvent.change(screen.getByLabelText("Content title 1"), { target: { value: "Public syllabus heading" } });
    fireEvent.change(screen.getByLabelText("Content description 1"), { target: { value: "Public syllabus description" } });
    fireEvent.click(screen.getByRole("button", { name: "Save changes" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/lessons/lesson-1", expect.objectContaining({ landingPageContent: { overview: "Public lesson description", syllabus: [{ title: "Public syllabus heading", description: "Public syllabus description" }] } })));
    expect(api.patch.mock.calls.some(([url]) => url.includes("/topics"))).toBe(false);
  });
  it("uses the Course and Medium context from the route, never CourseTrack", async () => { renderContent({}, ""); expect(await screen.findByRole("heading", { name: "ICT — Sinhala" })).toBeInTheDocument(); expect(screen.getByText("A/L")).toBeInTheDocument(); expect(screen.queryByText("CourseTrack")).not.toBeInTheDocument(); });
  it("has a collapsible outline in view mode with no authoring controls", async () => { renderContent(); expect(await screen.findByRole("heading", { name: "Introduction", level: 1 })).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Hardware" })).toBeInTheDocument(); expect(screen.getByText("Premium")).toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Collapse all" })); expect(screen.queryByRole("heading", { name: "Watch" })).not.toBeInTheDocument(); fireEvent.click(screen.getByRole("button", { name: "Expand all" })); expect(screen.getByRole("heading", { name: "Hardware" })).toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Watch" })).toBeInTheDocument(); expect(screen.queryByRole("button", { name: "Add lesson" })).not.toBeInTheDocument(); expect(screen.queryByLabelText("Actions for Introduction")).not.toBeInTheDocument(); });
  it("shows nested creation controls only after enabling edit mode", async () => { renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); expect(screen.getAllByRole("button", { name: "Add topic" })).not.toHaveLength(0); fireEvent.click(screen.getByRole("button", { name: "Add activity or resource" })); expect(screen.getByRole("dialog")).toBeInTheDocument(); expect(screen.getByRole("button", { name: /Label/ })).toBeInTheDocument(); });
  it("uses registry selection to create the selected activity type", async () => { api.post.mockResolvedValueOnce(response({ ...activity, id: "activity-2", type: "label", title: "New label" })); renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); fireEvent.click(screen.getByRole("button", { name: "Add activity or resource" })); fireEvent.click(screen.getByRole("button", { name: /Label/ })); expect(api.post).not.toHaveBeenCalled(); fireEvent.change(screen.getByLabelText("Title", { exact: true }), { target: { value: "New label" } }); fireEvent.click(screen.getByRole("button", { name: "Save changes" })); await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/admin/activities", expect.objectContaining({ type: "label", topicId: "topic-1" }))); });
  it("does not submit immutable or null activity fields when saving authoring fields", async () => { api.patch.mockResolvedValueOnce(response({ ...activity, title: "Updated watch" })); renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); fireEvent.click(screen.getByLabelText("Actions for Watch")); fireEvent.click(screen.getByLabelText("Edit Watch")); fireEvent.change(screen.getByLabelText("Title", { exact: true }), { target: { value: "Updated watch" } }); fireEvent.click(screen.getByRole("button", { name: "Save changes" })); await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/activities/activity-1", expect.objectContaining({ title: "Updated watch", config: {} }))); expect(api.patch.mock.calls[0][1]).not.toHaveProperty("status"); expect(api.patch.mock.calls[0][1]).not.toHaveProperty("estimatedMinutes"); });
  it("reorders lessons through the authoritative track endpoint", async () => { api.patch.mockResolvedValueOnce(response({})); renderContent({}, "/lessons/lesson-2"); fireEvent.click(await screen.findByRole("button", { name: "Settings" })); fireEvent.click(screen.getByLabelText("Actions for Networks")); fireEvent.click(screen.getByLabelText("Move Networks up")); await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/tracks/track-1/lessons/reorder", { orderedIds: ["lesson-2", "lesson-1"] })); });
  it("sends inline title updates and restores the saved title on failure", async () => { api.patch.mockRejectedValueOnce({ response: { data: { error: { message: "Title invalid" } } } }); renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); fireEvent.click(screen.getByRole("button", { name: "Rename Hardware" })); const title = screen.getByLabelText("Title for Hardware"); fireEvent.change(title, { target: { value: "" } }); expect(screen.getByRole("button", { name: "Save title" })).toBeDisabled(); expect(api.patch).not.toHaveBeenCalled(); fireEvent.change(title, { target: { value: "Updated introduction" } }); fireEvent.click(screen.getByRole("button", { name: "Save title" })); await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/topics/topic-1", { title: "Updated introduction" })); await waitFor(() => expect(screen.getByText("Title invalid")).toBeInTheDocument()); });
  it("redirects old admin feature routes to the signed-in account screen", () => { render(<MemoryRouter initialEntries={["/courses"]}><AdminShell user={user} /></MemoryRouter>); expect(screen.queryByText("Courses")).not.toBeInTheDocument(); expect(screen.getByRole("heading", { name: "Admin account" })).toBeInTheDocument(); expect(screen.getByRole("button", { name: "Sign out" })).toBeInTheDocument(); });
});
