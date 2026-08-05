import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn() }));
vi.mock("../src/api/client.js", () => ({ api, unwrap: (response) => response.data.data }));
import { AdminShell } from "../src/layouts/AdminShell.jsx";
import { CourseBuilderPage } from "../src/pages/CourseBuilderPage.jsx";

const response = (data) => ({ data: { data } });
const level = { id: "level-1", nameEn: "A/L" };
const course = { id: "course-1", academicLevelId: "level-1", title: "ICT" };
const medium = { id: "track-1", courseId: "course-1", title: "Sinhala", mediumLabel: "Sinhala" };
const lesson = { id: "lesson-1", trackId: "track-1", title: "Introduction", lessonNumber: 1, sortOrder: 1, status: "draft" };
const secondLesson = { id: "lesson-2", trackId: "track-1", title: "Networks", lessonNumber: 2, sortOrder: 2, status: "draft" };
const topic = { id: "topic-1", lessonId: "lesson-1", title: "Hardware", sortOrder: 1, status: "published" };
const activity = { id: "activity-1", lessonId: "lesson-1", topicId: "topic-1", title: "Watch", type: "video", accessPolicy: "premium", completionMode: "view", sortOrder: 1, status: "draft", config: {} };
const videoType = { code: "video", name: "Video", description: "Video", status: "active", supportedCompletionModes: ["none", "view"], defaultConfig: {} };

const mockLoads = () => api.get.mockImplementation((url) => {
  if (url.endsWith("/context")) return Promise.resolve(response({ academicLevels: [level], courses: [course], availableMedia: [{ id: "medium-1", name: "Sinhala" }], media: [medium] }));
  if (url.endsWith("/lessons")) return Promise.resolve(response([lesson, secondLesson]));
  if (url.endsWith("/topics")) return Promise.resolve(response([topic]));
  if (url.endsWith("/activities")) return Promise.resolve(response([activity]));
  return Promise.resolve(response([videoType]));
});

describe("Course Builder", () => {
  beforeEach(() => { api.get.mockReset(); api.post.mockReset(); api.patch.mockReset(); mockLoads(); });

  it("shows the authorized navigation entry and hides it without permission", () => {
    const { rerender } = render(<MemoryRouter><AdminShell user={{ name: "Editor", role: "content_editor", permissions: ["lessons.read", "tracks.read"] }} /></MemoryRouter>);
    expect(screen.getByText("Course Builder")).toBeInTheDocument();
    rerender(<MemoryRouter><AdminShell user={{ name: "Student", role: "student", permissions: [] }} /></MemoryRouter>);
    expect(screen.queryByText("Course Builder")).not.toBeInTheDocument();
  });

  it("renders Medium context and ordered lesson/topic/activity structure", async () => {
    render(<CourseBuilderPage />);
    expect(await screen.findByText("Medium")).toBeInTheDocument();
    expect(screen.getByText(/Lesson 1: Introduction/)).toBeInTheDocument();
    expect(screen.getByText(/Hardware/)).toBeInTheDocument();
    expect(screen.getByText(/video: Watch/)).toBeInTheDocument();
    expect(screen.getByText(/premium/)).toBeInTheDocument();
  });

  it("opens a lesson editor and saves its changes", async () => {
    api.patch.mockResolvedValueOnce(response({ ...lesson, title: "Updated introduction" }));
    render(<CourseBuilderPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Lesson 1: Introduction draft" }));
    fireEvent.change(screen.getByLabelText("Title"), { target: { value: "Updated introduction" } });
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/lessons/lesson-1", expect.objectContaining({ title: "Updated introduction" })));
  });

  it("reorders lessons through the authoritative track endpoint", async () => {
    api.patch.mockResolvedValueOnce(response({}));
    render(<CourseBuilderPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Move Networks up" }));
    await waitFor(() => expect(api.patch).toHaveBeenCalledWith("/api/v1/admin/tracks/track-1/lessons/reorder", { orderedIds: ["lesson-2", "lesson-1"] }));
  });

  it("creates a Course through the builder and posts the normalized context", async () => {
    api.post.mockResolvedValueOnce(response({ id: "course-2", academicLevelId: "level-1", title: "New ICT", slug: "new-ict" }));
    render(<CourseBuilderPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create Course" }));
    fireEvent.change(screen.getByLabelText("Course title"), { target: { value: "New ICT" } });
    fireEvent.submit(screen.getByLabelText("Course title").closest("form"));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/admin/content-builder/courses", expect.objectContaining({ academicLevelId: "level-1", slug: "new-ict" })));
  });

  it("creates a Medium for the selected Course", async () => {
    api.post.mockResolvedValueOnce(response({ id: "track-2", courseId: "course-1", mediumId: "medium-1", title: "Sinhala", slug: "sinhala" }));
    render(<CourseBuilderPage />);
    fireEvent.click(await screen.findByRole("button", { name: "Create Medium" }));
    const mediumSelect = screen.getAllByLabelText("Medium").at(-1);
    fireEvent.change(mediumSelect, { target: { value: "medium-1" } });
    fireEvent.submit(mediumSelect.closest("form"));
    await waitFor(() => expect(api.post).toHaveBeenCalledWith("/api/v1/admin/content-builder/media", expect.objectContaining({ courseId: "course-1", mediumId: "medium-1", slug: "sinhala" })));
  });
});
