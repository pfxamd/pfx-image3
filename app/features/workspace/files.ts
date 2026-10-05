const acceptedMimeTypes = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
]);

const acceptedExtensions = new Set([
  'jpg',
  'jpeg',
  'png',
  'webp',
]);

export interface FilePartition {
  readonly accepted: readonly File[];
  readonly rejected: readonly File[];
}

export function partitionImageFiles(files: readonly File[]): FilePartition {
  const accepted: File[] = [];
  const rejected: File[] = [];

  for (const file of files) {
    if (isSupportedImageFile(file)) accepted.push(file);
    else rejected.push(file);
  }

  return { accepted, rejected };
}

export function isSupportedImageFile(file: File): boolean {
  if (acceptedMimeTypes.has(file.type.toLowerCase())) return true;

  const extension = file.name.split('.').pop()?.toLowerCase();
  return extension !== undefined && acceptedExtensions.has(extension);
}
