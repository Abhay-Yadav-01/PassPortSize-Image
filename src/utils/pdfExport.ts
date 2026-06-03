import { jsPDF } from "jspdf";
import { 
  buildSheetSlots, 
  calculateSheetLayout, 
  type LayoutPhotoItem 
} from "./sheetLayout";

/**
 * Loads an image from a URL asynchronously.
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = (e) => reject(e);
    img.src = url;
  });
}

/**
 * Asynchronously crops and filters a high-resolution source image onto a canvas.
 * Returns a lossless PNG data URL.
 */
async function processHighResImage(photo: LayoutPhotoItem): Promise<string> {
  const img = await loadImage(photo.previewUrl);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Could not get 2D context");
  }

  const { croppedArea, brightness, contrast, saturation } = photo;

  if (croppedArea) {
    // Math coordinates in original pixels
    const sX = (croppedArea.x / 100) * img.naturalWidth;
    const sY = (croppedArea.y / 100) * img.naturalHeight;
    const sWidth = (croppedArea.width / 100) * img.naturalWidth;
    const sHeight = (croppedArea.height / 100) * img.naturalHeight;

    canvas.width = sWidth;
    canvas.height = sHeight;

    // Apply adjustments using hardware-accelerated Canvas filters
    ctx.filter = `
      brightness(${100 + brightness}%)
      contrast(${100 + contrast}%)
      saturate(${100 + saturation}%)
    `;

    ctx.drawImage(img, sX, sY, sWidth, sHeight, 0, 0, sWidth, sHeight);
  } else {
    // Default: full-image fall back
    canvas.width = img.naturalWidth;
    canvas.height = img.naturalHeight;

    ctx.filter = `
      brightness(${100 + brightness}%)
      contrast(${100 + contrast}%)
      saturate(${100 + saturation}%)
    `;

    ctx.drawImage(img, 0, 0);
  }

  return canvas.toDataURL("image/png", 1.0);
}

/**
 * Helper to parse hex colors and apply them as Fill Color in jsPDF.
 */
function setPdfFillColor(pdf: jsPDF, hex: string) {
  const cleaned = hex.replace("#", "");
  let r = 0, g = 0, b = 0;
  if (cleaned.length === 3) {
    r = parseInt(cleaned[0] + cleaned[0], 16);
    g = parseInt(cleaned[1] + cleaned[1], 16);
    b = parseInt(cleaned[2] + cleaned[2], 16);
  } else if (cleaned.length === 6) {
    r = parseInt(cleaned.substring(0, 2), 16);
    g = parseInt(cleaned.substring(2, 4), 16);
    b = parseInt(cleaned.substring(4, 6), 16);
  }
  pdf.setFillColor(r, g, b);
}

/**
 * Generates and downloads a multi-page, print-ready, physical millimeter A4 PDF document.
 * Draws high-resolution uncompressed cropped images at exactly correct physical scales.
 */
export async function exportToPDF(
  photos: LayoutPhotoItem[],
  marginMm: number = 5,
  gapXMm: number = 0.4,
  gapYMm: number = 0,
  borderWidthMm: number = 0.4,
  borderColor: string = "#000000"
): Promise<void> {
  const pages = buildSheetSlots(photos);
  
  // Create jsPDF in portrait orientation using millimeters
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const activePhoto = photos.find((p) => p.copies > 0) || photos[0];
  const activeAspect = activePhoto?.aspect ?? 35 / 40;

  // Retrieve exact millimeter specifications
  const layout = calculateSheetLayout(activeAspect, marginMm, gapXMm, gapYMm);

  for (let pageIdx = 0; pageIdx < pages.length; pageIdx++) {
    if (pageIdx > 0) {
      pdf.addPage();
    }

    const slots = pages[pageIdx];

    // Pre-load and crop all active photos in this page asynchronously
    const processedImages: Record<number, string> = {};
    const processPromises = slots.map(async (slot, index) => {
      if (slot) {
        processedImages[index] = await processHighResImage(slot);
      }
    });

    await Promise.all(processPromises);

    // Draw the grid on the physical PDF page
    for (let index = 0; index < slots.length; index++) {
      const col = index % layout.columnsCount;
      const row = Math.floor(index / layout.columnsCount);

      // Math coordinates in millimeters
      const x = layout.marginLeftMm + col * (layout.slotWidthMm + gapXMm);
      const y = layout.marginTopMm + row * (layout.slotHeightMm + gapYMm);

      const slot = slots[index];

      if (slot) {
        const croppedDataUrl = processedImages[index];

        // Draw solid background rectangle with selected borderColor
        setPdfFillColor(pdf, borderColor);
        pdf.rect(x, y, layout.slotWidthMm, layout.slotHeightMm, "F");

        if (croppedDataUrl) {
          // Draw uncompressed, cropped high-res image inset by borderWidthMm
          pdf.addImage(
            croppedDataUrl,
            "PNG",
            x + borderWidthMm,
            y + borderWidthMm,
            layout.slotWidthMm - 2 * borderWidthMm,
            layout.slotHeightMm - 2 * borderWidthMm
          );
        }

        // Draw fine print crop outlines
        pdf.setDrawColor(180, 180, 180);
        pdf.setLineWidth(0.1);
        pdf.setLineDashPattern([], 0);
        pdf.rect(x, y, layout.slotWidthMm, layout.slotHeightMm, "D");
      }
    }
  }

  // Trigger download in browser
  pdf.save("Passport_Photo_Sheet.pdf");
}
