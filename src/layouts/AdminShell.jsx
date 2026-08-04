import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import { DownloadableResourcesPage, GenericList, PaymentsPage } from "../pages/ManagementPages.jsx";

const pages = { Categories: "categories", Courses: "courses", Lessons: "lessons", Topics: "topics", "Learning content": "sections", Students: "students", Orders: "orders", Payments: "payments", Resources: "downloadable-resources" };
const lightLogoSource = `${import.meta.env.BASE_URL}images/aplus-ict-logo-light.png`;
const pageElement = (title, path) => path === "payments" ? <PaymentsPage /> : path === "downloadable-resources" ? <DownloadableResourcesPage /> : <GenericList path={path} title={title} />;

export const AdminShell = () => <div className="shell"><aside><img alt="A Plus ICT" className="admin-logo" src={lightLogoSource} /><p className="admin-label">Management workspace</p>{Object.entries(pages).map(([name, path]) => <NavLink key={path} to={`/${path}`}>{name}</NavLink>)}<button onClick={() => { localStorage.removeItem("aplus_admin_token"); location.assign("/login"); }}>Sign out</button></aside><main><Routes>{Object.entries(pages).map(([title, path]) => <Route element={pageElement(title, path)} key={path} path={`/${path}`} />)}<Route path="*" element={<Navigate to="/categories" />} /></Routes></main></div>;
