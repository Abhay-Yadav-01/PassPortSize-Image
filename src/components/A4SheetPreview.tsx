import { useState } from "react";
import { 
  buildSheetSlots, 
  calculateSheetLayout, 
  type LayoutPhotoItem 
} from "../utils/sheetLayout";
import { exportToPDF } from "../utils/pdfExport";

type A4SheetPreviewProps = {
  photos: LayoutPhotoItem[];
};

export default function A4SheetPreview({ photos }: A4SheetPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  // Split photos into grid slots divided across pages (48 slots per page)
  const pages = buildSheetSlots(photos);
  
  // Guard page range selection
  const pageIndex = Math.min(currentPage, pages.length - 1);
  const slots = pages[pageIndex];

  // Determine aspect ratio based on the first photo with copies, or default to 3.5x4
  const activePhoto = photos.find((p) => p.copies > 0) || photos[0];
  const activeAspect = activePhoto?.aspect ?? 35 / 40;

  // Physical Layout Dimensions Math (calculated in mm)
  const layout = calculateSheetLayout(activeAspect);

  const slotsPerPage = layout.columnsCount * layout.rowsCount;

  // Statistics
  const totalOccupied = photos.reduce((acc, p) => acc + p.copies, 0);
  const currentPageFilled = slots.filter((s) => s !== null).length;
  const currentPageUtilization = Math.round((currentPageFilled / slotsPerPage) * 100);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      await exportToPDF(photos);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("PDF generation failed. Please ensure you have uploaded photos and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="a4-preview-workspace">
      {/* Blurred Loading Overlay */}
      {isGenerating && (
        <div className="pdf-loading-overlay">
          <div className="loading-spinner"></div>
          <p className="loading-title">Generating Print-Quality PDF</p>
          <p className="loading-subtitle">Applying lossless cropping and filters on original files...</p>
        </div>
      )}

      {/* Dynamic Statistics Widgets */}
      <div className="sheet-stats">
        <div className="stat-card">
          <span className="stat-label">Total Photo Copies</span>
          <span className="stat-value">{totalOccupied} Total</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Page {pageIndex + 1} Slots</span>
          <span className="stat-value">{currentPageFilled} / {slotsPerPage} Filled</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Page Utilization</span>
          <span className="stat-value">{currentPageUtilization}%</span>
          <div className="utilization-bar-bg">
            <div
              className="utilization-bar-fill"
              style={{ width: `${currentPageUtilization}%` }}
            ></div>
          </div>
        </div>
        <div className="stat-card export-card">
          <span className="stat-label">Actions</span>
          <button
            className="btn-export-pdf"
            disabled={totalOccupied === 0 || isGenerating}
            onClick={handleExportPDF}
          >
            {isGenerating ? "Exporting..." : "📥 Export PDF"}
          </button>
        </div>
      </div>

      {/* Pagination Controls */}
      {pages.length > 1 && (
        <div className="sheet-pagination">
          <button
            className="pagination-btn"
            disabled={pageIndex === 0}
            onClick={() => setCurrentPage((prev) => Math.max(0, prev - 1))}
          >
            ◀ Previous Page
          </button>
          <span className="pagination-text">
            Page {pageIndex + 1} of {pages.length}
          </span>
          <button
            className="pagination-btn"
            disabled={pageIndex === pages.length - 1}
            onClick={() => setCurrentPage((prev) => Math.min(pages.length - 1, prev + 1))}
          >
            Next Page ▶
          </button>
        </div>
      )}

      {/* A4 Paper Viewport with Fluid Percentage-Based Centering */}
      <div className="a4-sheet-container">
        <div className="a4-sheet">
          <div
            className="a4-grid"
            style={{
              position: "absolute",
              left: `${(layout.marginLeftMm / 210) * 100}%`,
              top: `${(layout.marginTopMm / 297) * 100}%`,
              width: `${(layout.gridWidthMm / 210) * 100}%`,
              height: `${(layout.gridHeightMm / 297) * 100}%`,
              display: "grid",
              gridTemplateColumns: `repeat(${layout.columnsCount}, 1fr)`,
              gridTemplateRows: `repeat(${layout.rowsCount}, 1fr)`,
              columnGap: `${(0.7 / layout.gridWidthMm) * 100}%`,
              rowGap: `${(0.7 / layout.gridHeightMm) * 100}%`,
            }}
          >
            {slots.map((slot, index) => {
              if (!slot) {
                return (
                  <div key={`empty-${index}`} className="grid-slot empty-slot" />
                );
              }

              // Active slot rendering
              const { croppedArea, brightness, contrast, saturation } = slot;

              // Lossless CSS Crop style using absolute percentages
              const imageStyle: React.CSSProperties = croppedArea
                ? {
                    position: "absolute",
                    width: `${(100 / croppedArea.width) * 100}%`,
                    height: `${(100 / croppedArea.height) * 100}%`,
                    left: `-${(croppedArea.x / croppedArea.width) * 100}%`,
                    top: `-${(croppedArea.y / croppedArea.height) * 100}%`,
                    filter: `
                      brightness(${100 + brightness}%)
                      contrast(${100 + contrast}%)
                      saturate(${100 + saturation}%)
                    `,
                  }
                : {
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    filter: `
                      brightness(${100 + brightness}%)
                      contrast(${100 + contrast}%)
                      saturate(${100 + saturation}%)
                    `,
                  };

              return (
                <div key={`slot-${slot.id}-${index}`} className="grid-slot occupied">
                  <div className="photo-container">
                    <img
                      src={slot.previewUrl}
                      alt="Grid cell"
                      style={imageStyle}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
