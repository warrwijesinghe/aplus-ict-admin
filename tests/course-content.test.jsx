import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ api, unwrap: (response) => response.data.data }));
import { AdminShell } from "../src/layouts/AdminShell.jsx";
import { CourseContentPage } from "../src/pages/CourseContentPage.jsx";

const response = (data) => ({ data: { data } });
const level = { id: "level-1", name: "A/L" };
const course = { id: "course-1", academicLevelId: "level-1", title: "ICT" };
const medium = { id: "track-1", courseId: "course-1", title: "Sinhala", mediumLabel: "Sinhala", status: "published" };
const lesson = { id: "lesson-1", trackId: "track-1", title: "Introduction", lessonNumber: 1, sortOrder: 1, status: "draft" };
const secondLesson = { id: "lesson-2", trackId: "track-1", title: "Networks", lessonNumber: 2, sortOrder: 2, status: "draft" };
const topic = { id: "topic-1", lessonId: "lesson-1", title: "Hardware", sortOrder: 1, status: "published" };
const activity = { id: "activity-1", lessonId: "lesson-1", topicId: "topic-1", title: "Watch", type: "video", accessPolicy: "premium", completionMode: "view", sortOrder: 1, status: "draft", config: {} };
const videoType = { code: "video", name: "Video", description: "Video lesson", status: "active", supportedCompletionModes: ["none", "view"], defaultConfig: {} };
const labelType = { code: "label", name: "Label", description: "Short label", status: "active", supportedCompletionModes: ["none"], defaultConfig: {} };
const user = { name: "Editor", role: "content_editor", permissions: ["tracks.read", "lessons.read", "lessons.create", "lessons.update", "topics.read", "topics.create", "topics.update", "activities.read", "activities.create", "activities.update"] };
const loadMocks = () => api.get.mockImplementation((url) => {
  if (url.endsWith("/context")) return Promise.resolve(response({ academicLevels: [level], courses: [course], media: [medium] }));
  if (url.endsWith("/lessons")) return Promise.resolve(response([lesson, secondLesson]));
  if (url.endsWith("/topics")) return Promise.resolve(response([topic]));
  if (url.endsWith("/activities")) return Promise.resolve(response([activity]));
  return Promise.resolve(response([videoType, labelType]));
});
const renderContent = (props = {}) => render(<MemoryRouter initialEntries={["/courses/track-1/content"]}><Routes><Route element={<CourseContentPage user={{ ...user, ...props }} />} path="/courses/:courseTrackId/content" /></Routes></MemoryRouter>);

describe("Course content edit mode", () => {
  beforeEach(() => { api.get.mockReset(); api.post.mockReset(); api.patch.mockReset(); loadMocks(); });
  it("uses the Course and Medium context from the route, never CourseTrack", async () => { renderContent(); expect(await screen.findByRole("heading", { name: "ICT — Sinhala" })).toBeInTheDocument(); expect(screen.getByText("A/L")).toBeInTheDocument(); expect(screen.queryByText("CourseTrack")).not.toBeInTheDocument(); });
  it("has a clean view mode with no authoring controls", async () => { renderContent(); expect(await screen.findByText("Introduction")).toBeInTheDocument(); expect(screen.getByText("Hardware")).toBeInTheDocument(); expect(screen.getByText("Premium")).toBeInTheDocument(); expect(screen.queryByText("+ Add lesson")).not.toBeInTheDocument(); expect(screen.queryByLabelText("Actions for Introduction")).not.toBeInTheDocument(); });
  it("shows nested creation controls only after enabling edit mode", async () => { renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); expect(screen.getByText("+ Add lesson")).toBeInTheDocument(); expect(screen.getAllByText("+ Add topic")).not.toHaveLength(0); fireEvent.click(screen.getByText("+ Add activity or resource")); expect(screen.getByRole("dialog")).toBeInTheDocument(); expect(screen.getByRole("button", { name: /Label/ })).toBeInTheDocument(); });
  it("uses registry selection to create the selected activity type", async () => { api.post.mockResolvedValueOnce(response({ ...activity, id: "activity-2", type: "label", title: "New label" })); renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); fireEvent.click(screen.getByText("+ Add activity or resource")); fireEvent.click(screen.getByRole("button", { name: /Label/ })); await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/admin/activities", expect.objectContaining({ type: "label", topicId: "topic-1" }))); });
  it("reorders lessons through the authoritative track endpoint", async () => { api.patch.mockResolvedValueOnce(response({})); renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); fireEvent.click(screen.getByLabelText("Actions for Networks")); fireEvent.click(screen.getByLabelText("Move Networks up")); await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/tracks/track-1/lessons/reorder", { orderedIds: ["lesson-2", "lesson-1"] })); });
  it("sends inline title updates and reloads on failure", async () => { api.patch.mockRejectedValueOnce({ response: { data: { error: { message: "Title invalid" } } } }); renderContent(); fireEvent.click(await screen.findByLabelText("Edit mode")); const title = screen.getByLabelText("Title for Introduction"); fireEvent.change(title, { target: { value: "" } }); fireEvent.blur(title); expect(api.patch).not.toHaveBeenCalled(); fireEvent.change(title, { target: { value: "Updated introduction" } }); fireEvent.blur(title); await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/lessons/lesson-1", { title: "Updated introduction" })); await waitFor(() => expect(screen.getByText("Title invalid")).toBeInTheDocument()); });
  it("removes the legacy Course Builder entry and redirects its route", () => { render(<MemoryRouter><AdminShell user={user} /></MemoryRouter>); expect(screen.queryByText("Course Builder")).not.toBeInTheDocument(); expect(screen.getByText("Courses")).toBeInTheDocument(); });
});
