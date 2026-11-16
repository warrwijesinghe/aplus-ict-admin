import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { api, unwrap } from "../api/client.js";
import "./admin-dashboard.css";

const periods = { all: "All time", month: "This month", week: "This week", today: "Today" };
const format = new Intl.NumberFormat("en-LK");

const MetricCard = ({ title, labels, values, link, linkLabel }) => (
  <article className="admin-metric">
    <h2>{title}</h2>
    <dl>
      {Object.entries(labels).map(([key, label]) => (
        <div key={key}><dt>{label}</dt><dd>{values?.[key] == null ? "—" : format.format(values[key])}</dd></div>
      ))}
    </dl>
    {link && <Link className="admin-metric-link" to={link}>{linkLabel} <span aria-hidden="true">→</span></Link>}
  </article>
);

const sections = {
  courses: {
    title: "Courses",
    metric: "Courses",
    linkLabel: "View courses",
    labels: { total: "Total", active: "Active" },
    actions: [
      ["Open course workspace", "/courses/list", "Choose a medium to manage its lessons, settings, and participants."],
    ],
  },
  students: { title: "Students", metric: "Students", linkLabel: "Browse students", labels: periods, actions: [["Browse students", "/students/list", "Find student accounts and view enrolment and progress."]] },
  sales: { title: "Orders", metric: "Lesson sales", linkLabel: "View orders", labels: periods, actions: [["View orders", "/orders/list", "Review orders and payment status."]] },
};

export const AdminDashboard = ({ section, canReadCategories = false, links = {} }) => {
  const { data, isPending, isError, refetch } = useQuery({
    queryKey: ["admin", "dashboard"],
    queryFn: ({ signal }) => api.get("/api/v1/admin/dashboard", { signal }).then(unwrap),
  });
  const selected = sections[section];
  const metrics = selected ? [[section, selected]] : Object.entries(sections);
  const statistics = <>
    {isPending && <p className="resource-empty" role="status">Loading statistics…</p>}
    {isError && <p className="admin-error" role="alert">Couldn’t load statistics. <button type="button" onClick={() => refetch()}>Retry</button></p>}
    {data && <div className="admin-metrics">
      {metrics.map(([key, { metric, labels, linkLabel }]) => <MetricCard key={key} title={metric} labels={labels} values={data[key]} link={links[key]} linkLabel={linkLabel} />)}
    </div>}
  </>;
  const actions = selected && <div className="admin-section-actions">
      {selected.actions.map(([label, path, description]) => (
        <Link className="admin-metric admin-action-card" to={path} key={path}>
          <strong>{label} <span aria-hidden="true">→</span></strong>
          <span>{description}</span>
        </Link>
      ))}
      {section === "courses" && canReadCategories && (
        <Link className="admin-metric admin-action-card" to="/courses/categories">
          <strong>Manage Categories <span aria-hidden="true">→</span></strong>
          <span>Edit the categories and images shown in Explore Courses.</span>
        </Link>
      )}
  </div>;
  return <>
    <h1>{selected?.title || "Dashboard"}</h1>
    {section === "courses" ? <>
      <section className="courses-home-actions" aria-labelledby="course-actions-title">
        <h2 id="course-actions-title">Course management</h2>
        {actions}
      </section>
      <section className="admin-section-statistics" aria-labelledby="course-statistics-title">
        <h2 id="course-statistics-title">Course overview</h2>
        {statistics}
      </section>
    </> : selected ? <>{actions}<section className="admin-section-statistics" aria-label={selected.metric}>{statistics}</section></> : statistics}
  </>;
};
