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
export const MARGIN_MM = 5; // 0.5 cm borders margins
export const GRID_COLUMNS = 6; // 6 vertical columns must
export const GRID_ROWS = 8; // 8 rows = 48 copies per sheet
export const GRID_GAP_MM = 0.7;

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
 * Usable Width = 210 - 5 - 5 = 200 mm
 * Usable Height = 297 - 5 - 5 = 287 mm
 */
export function calculateSheetLayout(aspectRatio: number): SheetLayout {
  const usableWidthMm = A4_WIDTH_MM - MARGIN_MM * 2;   // 200 mm
  const usableHeightMm = A4_HEIGHT_MM - MARGIN_MM * 2; // 287 mm

  const totalGapWidth = (GRID_COLUMNS - 1) * GRID_GAP_MM; // 5 gaps * 0.7mm = 3.5 mm
  const totalGapHeight = (GRID_ROWS - 1) * GRID_GAP_MM;   // 7 gaps * 0.7mm = 4.9 mm

  // Columns are the permanent width unit to span the sheet usable width perfectly
  const slotWidthMm = (usableWidthMm - totalGapWidth) / GRID_COLUMNS; // (200 - 3.5) / 6 = 32.75 mm
  
  // Height adjusts to maintain the crop aspect ratio perfectly
  const slotHeightMm = slotWidthMm / aspectRatio;

  // Grid dimensions
  const gridWidthMm = GRID_COLUMNS * slotWidthMm + totalGapWidth;
  const gridHeightMm = GRID_ROWS * slotHeightMm + totalGapHeight;

  // Horizontally fills usableWidth perfectly (offsetX = 0).
  const offsetX = 0;
  // Center vertically if it fits, else align top inside margin
  const offsetY = Math.max(0, (usableHeightMm - gridHeightMm) / 2);

  return {
    slotWidthMm,
    slotHeightMm,
    gridWidthMm,
    gridHeightMm,
    usableWidthMm,
    usableHeightMm,
    marginMm: MARGIN_MM,
    marginTopMm: MARGIN_MM + offsetY,
    marginLeftMm: MARGIN_MM + offsetX,
    columnsCount: GRID_COLUMNS,
    rowsCount: GRID_ROWS,
  };
}

/**
 * Packs photos with copy counts into a multi-page array structure.
 * Each page contains exactly 48 slots (6 columns x 8 rows).
 */
export function buildSheetSlots(photos: LayoutPhotoItem[]): (LayoutPhotoItem | null)[][] {
  const pages: (LayoutPhotoItem | null)[][] = [];
  let currentPageSlots: (LayoutPhotoItem | null)[] = [];
  const slotsPerPage = GRID_COLUMNS * GRID_ROWS; // 48 copies per sheet

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
