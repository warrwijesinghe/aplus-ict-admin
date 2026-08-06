import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AssignmentManagementPage, DownloadableResourcesPage, EducatorWorkspacePage, EducatorsPage, GenericList, PaymentsPage, RolesPage } from "../pages/ManagementPages.jsx";
import { ResourceLibraryPage } from "../pages/ResourceLibraryPage.jsx";
import { CourseContentPage, CoursesPage } from "../pages/CourseContentPage.jsx";
import { QuestionBankPage } from "../pages/QuestionBankPage.jsx";
import { QuizBuilderPage } from "../pages/QuizBuilderPage.jsx";
import { GradebookPage } from "../pages/GradebookPage.jsx";
import { StudentDetailPage, StudentsPage } from "../pages/StudentManagementPage.jsx";

const pages = [["Dashboard", "educator-workspace", "tracks.read", false], ["Courses", "courses", "tracks.read", false], ["Question Bank", "question-bank", "questions.read", false], ["Users", "educators", "educators.read", true], ["Resources", "resources", "resources.read", true], ["Categories", "categories", "courses.read", true], ["Lessons", "lessons", "lessons.read", true], ["Topics", "topics", "topics.read", true], ["Learning content", "sections", "activities.read", true], ["Students", "students", "students.read", true], ["Orders", "orders", "orders.read", true], ["Payments", "payments", "payments.read", true], ["Course assignments", "educator-assignments", "educators.assign", true], ["Roles", "roles", "roles.read", true]];
const lightLogoSource = `${import.meta.env.BASE_URL}images/aplus-ict-logo-light.png`;
const pageElement = (title, path) => path === "educator-workspace" ? <EducatorWorkspacePage /> : path === "courses" ? <CoursesPage /> : path === "question-bank" ? <QuestionBankPage /> : path === "payments" ? <PaymentsPage /> : path === "resources" ? <ResourceLibraryPage /> : path === "downloadable-resources" ? <DownloadableResourcesPage /> : path === "educators" ? <EducatorsPage /> : path === "educator-assignments" ? <AssignmentManagementPage /> : path === "roles" ? <RolesPage /> : path === "students" ? <StudentsPage /> : <GenericList path={path} title={title} />;

export const AdminShell = ({ user }) => {
  const isAdministrator = ["admin", "super_admin"].includes(user.role);
  const visible = pages.filter(([, , permission, adminOnly]) => user.permissions?.includes(permission) && (!adminOnly || isAdministrator));
  const fallback = visible[0]?.[1] || "login";
  return <div className="shell"><aside><img alt="A Plus ICT" className="admin-logo" src={lightLogoSource} /><p className="admin-label">{user.name || "Management"} · {user.role}</p>{visible.map(([name, path]) => <NavLink key={path} to={`/${path}`}>{name}</NavLink>)}<button onClick={() => { localStorage.removeItem("aplus_admin_token"); location.assign("/login"); }}>Sign out</button></aside><main><Routes>{visible.map(([title, path]) => <Route element={pageElement(title, path)} key={path} path={`/${path}`} />)}<Route element={<StudentDetailPage />} path="/students/:studentId" /><Route element={<CourseContentPage user={user} />} path="/courses/:courseTrackId/content" /><Route element={<QuizBuilderPage />} path="/courses/:courseTrackId/content/quiz/:activityId" /><Route element={<GradebookPage />} path="/courses/:courseTrackId/gradebook" /><Route path="/content-builder" element={<Navigate replace to="/courses" />} /><Route path="*" element={<Navigate to={`/${fallback}`} />} /></Routes></main></div>;
};
