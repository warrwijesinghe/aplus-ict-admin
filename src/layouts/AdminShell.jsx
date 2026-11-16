import { useState } from "react";
import { Link, NavLink, Navigate, Route, Routes, useMatch } from "react-router-dom";
import { AdminDashboard } from "../pages/AdminDashboard.jsx";
import { OrdersPage } from "../pages/CommercePages.jsx";
import { CourseContentPage, CoursesPage } from "../pages/CourseContentPage.jsx";
import { CourseSetupPage } from "../pages/CourseSetupPage.jsx";
import { CourseCategoriesPage } from "../pages/CourseCategoriesPage.jsx";
import { QuizBuilderPage } from "../pages/QuizBuilderPage.jsx";
import { StudentDetailPage, StudentsPage } from "../pages/StudentManagementPage.jsx";

const logoSource = `${import.meta.env.BASE_URL}images/aplus-brand-on-light.png`;

export const AdminShell = ({ user }) => {
  const [workspaceActions, setWorkspaceActions] = useState(null);
  const canViewDashboard = ["admin", "super_admin"].includes(user.role);
  const canReadCourses = canViewDashboard && user.permissions?.includes("tracks.read");
  const canReadCategories = canReadCourses && user.permissions?.includes("courses.read");
  const canReadStudents = canViewDashboard && user.permissions?.includes("students.read");
  const canReadOrders = canViewDashboard && user.permissions?.includes("orders.view");
  const courseMatch = useMatch("/courses/:courseTrackId/content");
  const lessonMatch = useMatch("/courses/:courseTrackId/lessons/:lessonId");
  const inWorkspace = canReadCourses && Boolean(courseMatch || lessonMatch);
  const navigation = <>
    <NavLink end to="/">Dashboard</NavLink>
    {canReadCourses && <NavLink to="/courses">Courses</NavLink>}
    {canReadStudents && <NavLink to="/students">Students</NavLink>}
    {canReadOrders && <NavLink to="/orders">Orders</NavLink>}
  </>;
  const signOut = () => {
    localStorage.removeItem("aplus_admin_token");
    location.assign(import.meta.env.BASE_URL);
  };

  return <div className="admin-shell">
      <header className="admin-overview-header">
        <Link to="/" className="admin-brand"><img alt="A Plus ICT" src={logoSource} /></Link>
        {canViewDashboard && <nav aria-label="Admin navigation">{navigation}</nav>}
        <button onClick={signOut} type="button">Sign out</button>
        {inWorkspace && <div className="workspace-global-actions" ref={setWorkspaceActions} />}
      </header>
    <main className={inWorkspace ? "admin-overview admin-overview-workspace" : "admin-overview"}>
    <Routes>
      <Route path="/" element={canViewDashboard ? <AdminDashboard links={{
        courses: canReadCourses ? "/courses/list" : undefined,
        students: canReadStudents ? "/students/list" : undefined,
        sales: canReadOrders ? "/orders/list" : undefined,
      }} /> : <>
        <h1>Admin account</h1>
        <p>Signed in as {user.name || user.email || user.role}.</p>
      </>} />
      {canReadCourses && <>
        <Route path="/courses" element={<AdminDashboard section="courses" canReadCategories={canReadCategories} />} />
        {canReadCategories && <Route path="/courses/categories" element={<CourseCategoriesPage user={user} />} />}
        <Route path="/courses/list" element={<CoursesPage />} />
        <Route path="/courses/setup" element={<CourseSetupPage user={user} />} />
        <Route path="/courses/:courseTrackId/content" element={<CourseContentPage user={user} headerActions={workspaceActions} />} />
        <Route path="/courses/:courseTrackId/lessons/:lessonId" element={<CourseContentPage user={user} headerActions={workspaceActions} />} />
        <Route path="/courses/:courseTrackId/content/quiz/:activityId" element={<QuizBuilderPage user={user} />} />
      </>}
      {canReadStudents && <>
        <Route path="/students" element={<AdminDashboard section="students" />} />
        <Route path="/students/list" element={<StudentsPage />} />
        <Route path="/students/:studentId" element={<StudentDetailPage />} />
      </>}
      {canReadOrders && <>
        <Route path="/orders" element={<AdminDashboard section="sales" />} />
        <Route path="/orders/list" element={<OrdersPage />} />
      </>}
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
    </main>
  </div>;
};
