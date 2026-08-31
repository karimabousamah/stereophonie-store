export type UploadImageKind = "product" | "category";

export async function processImageBeforeUpload(
  file: File,
  kind: UploadImageKind,
) {
  const form = new FormData();

  form.append("file", file);

  form.append("kind", kind);

  const response = await fetch("/api/admin/images/process", {
    method: "POST",
    body: form,
  });

  if (!response.ok) {
    const result = await response.json().catch(() => null);

    throw new Error(result?.error || "Image processing failed.");
  }

  const blob = await response.blob();

  const cleanName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return new File([blob], `${cleanName || "stereophonie-image"}.png`, {
    type: "image/png",
    lastModified: Date.now(),
  });
}
