import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { AssignmentManagementPage, DownloadableResourcesPage, EducatorsPage, GenericList, PaymentsPage, RolesPage } from "../pages/ManagementPages.jsx";

const pages = [
  ["Categories", "categories", "courses.read"], ["Courses", "courses", "courses.read"], ["Lessons", "lessons", "lessons.read"], ["Topics", "topics", "topics.read"], ["Learning content", "sections", "activities.read"], ["Students", "students", "students.read"], ["Orders", "orders", "orders.read"], ["Payments", "payments", "payments.read"], ["Resources", "downloadable-resources", "resources.read"], ["Educators", "educators", "educators.read"], ["Course assignments", "educator-assignments", "educators.assign"], ["Roles", "roles", "roles.read"]
];
const lightLogoSource = `${import.meta.env.BASE_URL}images/aplus-ict-logo-light.png`;
const pageElement = (title, path) => path === "payments" ? <PaymentsPage /> : path === "downloadable-resources" ? <DownloadableResourcesPage /> : path === "educators" ? <EducatorsPage /> : path === "educator-assignments" ? <AssignmentManagementPage /> : path === "roles" ? <RolesPage /> : <GenericList path={path} title={title} />;

export const AdminShell = ({ user }) => { const visible = pages.filter(([, , permission]) => user.permissions?.includes(permission)); const fallback = visible[0]?.[1] || "login"; return <div className="shell"><aside><img alt="A Plus ICT" className="admin-logo" src={lightLogoSource} /><p className="admin-label">{user.name || "Management"} · {user.role}</p>{visible.map(([name, path]) => <NavLink key={path} to={`/${path}`}>{name}</NavLink>)}<button onClick={() => { localStorage.removeItem("aplus_admin_token"); location.assign("/login"); }}>Sign out</button></aside><main><Routes>{visible.map(([title, path]) => <Route element={pageElement(title, path)} key={path} path={`/${path}`} />)}<Route path="*" element={<Navigate to={`/${fallback}`} />} /></Routes></main></div>; };
