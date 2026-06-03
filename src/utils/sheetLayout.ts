export type LayoutPhotoItem = {
  id: string;
  previewUrl: string;
  copies: number;
  brightness: number;
  contrast: number;
  saturation: number;
  croppedArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  aspect?: number;
};

export const A4_WIDTH_MM = 210;
export const A4_HEIGHT_MM = 297;
export const GRID_COLUMNS = 6;
export const GRID_ROWS = 5; // 30 slots per sheet always

export type SheetLayout = {
  slotWidthMm: number;
  slotHeightMm: number;
  gridWidthMm: number;
  gridHeightMm: number;
  usableWidthMm: number;
  usableHeightMm: number;
  marginMm: number;
  marginTopMm: number;
  marginLeftMm: number;
  columnsCount: number;
  rowsCount: number;
};

/**
 * Computes available paper dimensions and sizes the grid slots based on physical A4 constraints.
 * Ensures the slot grid maintains aspect ratio and fits completely within printable bounds.
 */
export function calculateSheetLayout(
  aspectRatio: number,
  marginMm: number = 5,
  gapXMm: number = 0.7,
  gapYMm: number = 0.7
): SheetLayout {
  const usableWidthMm = A4_WIDTH_MM - marginMm * 2;
  const usableHeightMm = A4_HEIGHT_MM - marginMm * 2;

  const totalGapWidth = (GRID_COLUMNS - 1) * gapXMm;
  const totalGapHeight = (GRID_ROWS - 1) * gapYMm;

  // Containment math to calculate max limits
  const maxSlotWidthMm = (usableWidthMm - totalGapWidth) / GRID_COLUMNS;
  const maxSlotHeightMm = (usableHeightMm - totalGapHeight) / GRID_ROWS;

  let slotWidthMm = maxSlotWidthMm;
  let slotHeightMm = slotWidthMm / aspectRatio;

  if (slotHeightMm > maxSlotHeightMm) {
    slotHeightMm = maxSlotHeightMm;
    slotWidthMm = slotHeightMm * aspectRatio;
  }

  // Grid dimensions
  const gridWidthMm = GRID_COLUMNS * slotWidthMm + totalGapWidth;
  const gridHeightMm = GRID_ROWS * slotHeightMm + totalGapHeight;

  // Center horizontally within the printable margin area
  const offsetX = (usableWidthMm - gridWidthMm) / 2;

  // Align to the top of the printable margin area (no vertical centering) to reduce top spacing
  const marginTopMm = marginMm;
  const marginLeftMm = marginMm + offsetX;

  return {
    slotWidthMm,
    slotHeightMm,
    gridWidthMm,
    gridHeightMm,
    usableWidthMm,
    usableHeightMm,
    marginMm,
    marginTopMm,
    marginLeftMm,
    columnsCount: GRID_COLUMNS,
    rowsCount: GRID_ROWS,
  };
}

/**
 * Packs photos with copy counts into a multi-page array structure.
 * Each page contains exactly 30 slots (6 columns x 5 rows).
 */
export function buildSheetSlots(photos: LayoutPhotoItem[]): (LayoutPhotoItem | null)[][] {
  const pages: (LayoutPhotoItem | null)[][] = [];
  let currentPageSlots: (LayoutPhotoItem | null)[] = [];
  const slotsPerPage = GRID_COLUMNS * GRID_ROWS; // 30 copies per sheet

  for (const photo of photos) {
    const copies = photo.copies || 0;
    for (let i = 0; i < copies; i++) {
      if (currentPageSlots.length >= slotsPerPage) {
        pages.push(currentPageSlots);
        currentPageSlots = [];
      }
      currentPageSlots.push(photo);
    }
  }

  // Handle final page padding
  if (currentPageSlots.length > 0) {
    while (currentPageSlots.length < slotsPerPage) {
      currentPageSlots.push(null);
    }
    pages.push(currentPageSlots);
  }

  // Fallback: at least one empty page
  if (pages.length === 0) {
    const emptyPage = Array(slotsPerPage).fill(null);
    pages.push(emptyPage);
  }

  return pages;
}
