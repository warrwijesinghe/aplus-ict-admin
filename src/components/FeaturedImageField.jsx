import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { api, unwrap } from "../api/client.js";
import { ResourcePicker } from "./ResourcePicker.jsx";

export const FeaturedImageField = ({ value, onChange, onUploading, canUpload, busy }) => {
  const [showImages, setShowImages] = useState(false);
  const upload = useMutation({
    mutationFn: (file) => {
      const body = new FormData();
      body.append("file", file);
      body.append("category", "site_asset");
      body.append("visibility", "public");
      body.append("accessPolicy", "public");
      return api.post("/api/v1/admin/resources", body).then(unwrap);
    },
    onMutate: () => onUploading(true),
    onSuccess: (image) => onChange(image.id),
    onSettled: () => onUploading(false),
  });
  return <div>
      <strong>Featured image</strong>
      {canUpload && <label>Upload image<input type="file" accept="image/*" disabled={upload.isPending || busy} onChange={(event) => {
        const file = event.target.files?.[0];
        if (file) upload.mutate(file);
        event.target.value = "";
      }} /></label>}
      {upload.isPending && <p role="status">Uploading image…</p>}
      {upload.error && <p role="alert">{upload.error.response?.data?.error?.message || upload.error.message}</p>}
      {value && <img className="category-image-preview" alt="Selected featured image" src={`${api.defaults.baseURL}/api/v1/resources/${value}/content`} />}
      <button type="button" onClick={() => setShowImages(!showImages)}>{showImages ? "Close image library" : "Choose featured image"}</button>
      {value && <button type="button" onClick={() => onChange(null)}>Remove image</button>}
      {showImages && <ResourcePicker allowedMimeTypes={["image/"]} publicOnly onSelect={(image) => {
        onChange(image.id);
        setShowImages(false);
      }} />}
    </div>;
};
