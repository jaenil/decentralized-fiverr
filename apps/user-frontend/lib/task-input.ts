export function parseTaskId(value: string): number | null {
  const trimmed = value.trim();
  const id = Number(trimmed);
  return /^\d+$/.test(trimmed) && Number.isSafeInteger(id) && id > 0
    ? id
    : null;
}
export function imageValidation(files: File[]): string | null {
  if (files.length > 10) return "Choose no more than 10 images.";
  if (
    files.some(
      (file) => !["image/png", "image/jpeg", "image/webp"].includes(file.type),
    )
  )
    return "Choose PNG, JPEG, or WebP images.";
  if (files.some((file) => file.size > 5 * 1024 * 1024))
    return "Each image must be 5 MiB or smaller.";
  return null;
}
