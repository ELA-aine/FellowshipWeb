// Shared "upload photos to the gallery" flow (used by the Gallery page and the Welcome hero).
import { sb, formModal, toast, uploadImage } from "./backend.js";

export const PHOTO_CATS = ["Worship", "Community", "Study", "Service", "Events", "Other"];

// Asks for files + category + caption, uploads, inserts rows. Resolves with the number uploaded.
export async function uploadPhotosFlow() {
  const r = await formModal({
    title: "Upload photos",
    submitLabel: "Upload",
    fields: [
      { name: "files", label: "Choose photos", type: "file", multiple: true, accept: "image/*", required: true },
      { name: "category", label: "Category", type: "select", options: PHOTO_CATS },
      { name: "caption", label: "Caption (optional, applied to all)" },
    ],
  });
  if (!r || !r.files.length) return 0;
  toast(`Uploading ${r.files.length} photo(s)\u2026`);
  let ok = 0;
  for (const f of r.files) {
    try {
      const { path, url } = await uploadImage(f);
      const { error } = await sb.from("photos").insert({ path, url, caption: r.caption.trim() || null, category: r.category });
      if (error) throw error;
      ok++;
    } catch (e) {
      toast(`${f.name}: ${e.message}`, "err");
    }
  }
  if (ok) toast(`${ok} photo(s) uploaded.`);
  return ok;
}
