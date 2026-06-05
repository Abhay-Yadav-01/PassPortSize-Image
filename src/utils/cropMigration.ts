/**
 * Helper to dynamically read width and height of an image URL.
 */
export function getImageDimensions(url: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

/**
 * Calculates centered percentage coordinates matching a specific target aspect ratio.
 * This is used for legacy V1 imports if croppedArea is missing, or for fresh uploads.
 */
export function calculateCenteredCropArea(
  imageWidth: number,
  imageHeight: number,
  aspect: number | undefined
) {
  if (!imageWidth || !imageHeight) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  // Free aspect ratio occupies the entire image
  if (aspect === undefined) {
    return { x: 0, y: 0, width: 100, height: 100 };
  }

  const imageAspect = imageWidth / imageHeight;
  let cropWidthPercent = 90;
  let cropHeightPercent = 90;

  if (aspect > imageAspect) {
    // Crop is wider than image (limit by width)
    cropWidthPercent = 90;
    cropHeightPercent = (cropWidthPercent / aspect) * imageAspect;
  } else {
    // Crop is taller than image (limit by height)
    cropHeightPercent = 90;
    cropWidthPercent = (cropHeightPercent * aspect) / imageAspect;
  }

  // Ensure within bounds and rounded to 2 decimals
  const width = Math.min(100, Math.max(1, Number(cropWidthPercent.toFixed(2))));
  const height = Math.min(100, Math.max(1, Number(cropHeightPercent.toFixed(2))));
  const x = Math.max(0, Number(((100 - width) / 2).toFixed(2)));
  const y = Math.max(0, Number(((100 - height) / 2).toFixed(2)));

  return { x, y, width, height };
}

/**
 * Adjusts an existing percentage-based cropped area to match a new aspect ratio,
 * attempting to preserve the center of the crop as much as possible.
 */
export function adjustCropAreaAspect(
  croppedArea: { x: number; y: number; width: number; height: number },
  aspect: number | undefined,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number; width: number; height: number } {
  if (aspect === undefined || !imageWidth || !imageHeight) {
    return croppedArea;
  }

  const cx = croppedArea.x + croppedArea.width / 2;
  const cy = croppedArea.y + croppedArea.height / 2;

  const imageAspect = imageWidth / imageHeight;
  const cropAspectInPercentScale = aspect / imageAspect;

  let w = croppedArea.width;
  let h = w / cropAspectInPercentScale;

  if (h > croppedArea.height) {
    h = croppedArea.height;
    w = h * cropAspectInPercentScale;
  }

  const maxWidth = 2 * Math.min(cx, 100 - cx);
  const maxHeight = 2 * Math.min(cy, 100 - cy);

  if (w > maxWidth) {
    const scale = maxWidth / w;
    w = maxWidth;
    h = h * scale;
  }
  if (h > maxHeight) {
    const scale = maxHeight / h;
    h = maxHeight;
    w = w * scale;
  }

  w = Math.min(100, Math.max(1, Number(w.toFixed(2))));
  h = Math.min(100, Math.max(1, Number(h.toFixed(2))));
  const x = Math.max(0, Math.min(100 - w, Number((cx - w / 2).toFixed(2))));
  const y = Math.max(0, Math.min(100 - h, Number((cy - h / 2).toFixed(2))));

  return { x, y, width: w, height: h };
}

