import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, unwrap } from "../api/client.js";

const path = "/api/v1/admin/products";
const productType = "lesson_exam_success_pack";
const errorMessage = (error) => error.response?.data?.error?.message || error.message;

const PriceForm = ({ product, lesson, track, permissions, refresh, report }) => {
  const [price, setPrice] = useState(product?.price ?? "");
  const [original, setOriginal] = useState(product?.compareAtPrice ?? "");
  const canSave = permissions.includes(product ? "products.update" : "products.create");
  const live = product && ["published", "active"].includes(product.status);
  const changed = price !== (product?.price ?? "") || original !== (product?.compareAtPrice ?? "");
  const mutation = useMutation({
    mutationFn: (action) => {
      if (action !== "save") return api.post(`${path}/${product.id}/${action}`);
      const values = { price, compareAtPrice: original || null };
      return product ? api.patch(`${path}/${product.id}`, values) : api.post(path, {
        ...values, productType, currency: "LKR", courseId: track.courseId, courseTrackId: track.id,
        lessonId: lesson.id, name: lesson.title, slug: `lesson-${lesson.id}`,
      });
    },
    onSuccess: async (_, action) => {
      report(action === "save" ? "Price saved." : action === "publish" ? "Price published." : "Price unpublished.");
      await refresh();
    },
  });
  return <form className="lesson-price-form" onSubmit={(event) => {
    event.preventDefault();
    if (canSave && changed && !mutation.isPending) { report(""); mutation.mutate("save"); }
  }}>
    <p>{product ? <><strong>{product.name}</strong> · {live ? "Published" : product.status}</> : "Set a price to create a draft lesson offer."}</p>
    <div className="course-settings-grid">
      <label>Selling price (LKR)<input type="number" min="0.01" max="9999999999.99" step="0.01" required value={price} disabled={!canSave || mutation.isPending} onChange={(event) => setPrice(event.target.value)} /></label>
      <label>Original price (LKR, optional)<input type="number" min={(Math.round(Number(price || 0) * 100) + 1) / 100} max="9999999999.99" step="0.01" value={original} disabled={!canSave || mutation.isPending} onChange={(event) => setOriginal(event.target.value)} /></label>
    </div>
    <div className="lesson-pricing-actions">
      {canSave && <button type="submit" disabled={!changed || mutation.isPending}>{product ? "Save price" : "Save draft price"}</button>}
      {product && permissions.includes("products.publish") && <button type="button" disabled={changed || mutation.isPending} onClick={() => { report(""); mutation.mutate(live ? "unpublish" : "publish"); }}>{live ? "Unpublish price" : "Publish price"}</button>}
    </div>
    {mutation.error && <p role="alert" className="admin-error">{errorMessage(mutation.error)}</p>}
  </form>;
};

export const LessonPricing = ({ lesson, track, permissions }) => {
  const client = useQueryClient();
  const [notice, setNotice] = useState("");
  const queryKey = ["admin", "lesson-pricing", lesson.id];
  const { data, isPending, error, refetch } = useQuery({
    queryKey,
    queryFn: ({ signal }) => api.get(path, { signal, params: { lessonId: lesson.id, courseTrackId: track.id, productType } }).then(unwrap),
  });
  const products = (data || []).filter(({ status }) => status !== "archived");
  const refresh = () => client.invalidateQueries({ queryKey });
  return <section className="resource-form course-settings lesson-pricing" aria-labelledby="lesson-pricing-title">
    <header><h2 id="lesson-pricing-title">Lesson pricing</h2><p>Leave the original price blank to show a single price. A published price applies to new purchases.</p></header>
    {notice && <p role="status">{notice}</p>}
    {isPending && <p role="status">Loading lesson pricing…</p>}
    {error && <p role="alert">{errorMessage(error)} <button type="button" onClick={() => refetch()}>Retry</button></p>}
    {data && !products.length && (permissions.includes("products.create")
      ? <PriceForm lesson={lesson} track={track} permissions={permissions} refresh={refresh} report={setNotice} />
      : <p>No price has been set for this lesson.</p>)}
    {products.map((product) => <PriceForm key={`${product.id}:${product.price}:${product.compareAtPrice}`} product={product} lesson={lesson} track={track} permissions={permissions} refresh={refresh} report={setNotice} />)}
  </section>;
};
