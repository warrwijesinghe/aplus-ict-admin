import { useEffect, useState } from "react";
import { api, unwrap } from "../api/client.js";

export const ResourcePicker = ({ allowedCategories = [], onSelect }) => {
  const [items, setItems] = useState([]); const [search, setSearch] = useState(""); const [error, setError] = useState("");
  useEffect(() => { api.get("/api/v1/admin/resources", { params: { search, limit: 50 } }).then(unwrap).then((data) => setItems(data.items || [])).catch((requestError) => setError(requestError.response?.data?.error?.message || "Unable to load resources")); }, [search]);
  const compatible = items.filter((item) => !allowedCategories.length || allowedCategories.includes(item.category));
  return <section className="resource-picker"><label>Find a resource<input onChange={(event) => setSearch(event.target.value)} placeholder="Search uploaded files" value={search} /></label>{error ? <p className="admin-error">{error}</p> : null}<div>{compatible.map((item) => <button key={item.id} onClick={() => onSelect?.(item)} type="button"><strong>{item.displayName}</strong><small>{item.category} · {item.mimeType}</small></button>)}</div>{!compatible.length && !error ? <p className="resource-empty">No compatible active resources found.</p> : null}</section>;
};
