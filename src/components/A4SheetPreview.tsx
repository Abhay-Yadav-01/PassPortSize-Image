import { useState } from "react";
import { 
  buildSheetSlots, 
  calculateSheetLayout, 
} from "../utils/sheetLayout";
import { exportToPDF } from "../utils/pdfExport";
import type { PhotoItem } from "../App";
import WizardProgressBar from "./WizardProgressBar";

type Step = 1 | 2 | 3 | 4;

type A4SheetPreviewProps = {
  photos: PhotoItem[];
  onUpdateCopies: (id: string, change: number) => void;
  currentStep: Step;
  setCurrentStep: (step: Step) => void;
  onNewProject: () => void;
};

export default function A4SheetPreview({ 
  photos, 
  onUpdateCopies,
  currentStep,
  setCurrentStep,
  onNewProject
}: A4SheetPreviewProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [showSliders, setShowSliders] = useState(true);

  // States for Arrangement Controls (with customized defaults)
  const [borderWidthMm, setBorderWidthMm] = useState(0.6);
  const [gapXMm, setGapXMm] = useState(1.4);
  const [gapYMm, setGapYMm] = useState(3.0);
  const [borderColor, setBorderColor] = useState("#000000");

  // Split photos into grid slots divided across pages (30 slots per page)
  const pages = buildSheetSlots(photos);
  
  // Guard page range selection
  const pageIndex = Math.min(currentPage, pages.length - 1);
  const slots = pages[pageIndex];

  // Determine aspect ratio based on the first photo with copies, or default to 3.5x4
  const activePhoto = photos.find((p) => p.copies > 0) || photos[0];
  const activeAspect = activePhoto?.aspect ?? 35 / 40;

  // Physical Layout Dimensions Math (calculated in mm)
  const layout = calculateSheetLayout(activeAspect, 5, gapXMm, gapYMm);

  const slotsPerPage = layout.columnsCount * layout.rowsCount;

  // Statistics
  const totalOccupied = photos.reduce((acc, p) => acc + p.copies, 0);
  const currentPageFilled = slots.filter((s) => s !== null).length;
  const currentPageUtilization = Math.round((currentPageFilled / slotsPerPage) * 100);

  const handleExportPDF = async () => {
    setIsGenerating(true);
    try {
      await exportToPDF(photos, 5, gapXMm, gapYMm, borderWidthMm, borderColor);
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

      {/* Top Action Row (Export and New Project) */}
      <div className="top-action-row" style={{ display: "flex", justifyContent: "flex-end", gap: "12px", width: "100%", marginBottom: "10px" }}>
        <button
          className="btn-export-pdf"
          disabled={totalOccupied === 0 || isGenerating}
          onClick={handleExportPDF}
          style={{
            height: "36px",
            padding: "0 16px",
            margin: 0,
            fontSize: "14px",
            width: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px"
          }}
        >
          {isGenerating ? "Exporting..." : "📥 Export PDF"}
        </button>
        <button
          className="btn-action btn-delete"
          onClick={onNewProject}
          style={{
            height: "36px",
            padding: "0 16px",
            margin: 0,
            fontSize: "14px",
            fontWeight: "600",
            width: "auto",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px"
          }}
        >
          🧹 New Project
        </button>
      </div>

      {/* Photo Copies Control Row/Grid */}
      <div className="controls-panel copies-planner-panel" style={{ marginTop: 0 }}>
        <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "16px", color: "white" }}>
          Edit Copies Count
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "16px" }}>
          {photos.map((photo) => (
            <div key={photo.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "#1b2030", padding: "10px 16px", borderRadius: "10px", border: "1px solid #2e374e", gap: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", overflow: "hidden" }}>
                <div style={{ width: "40px", height: "45px", borderRadius: "6px", overflow: "hidden", background: "#090b0e", border: "1px solid #2d364d", flexShrink: 0 }}>
                  <img src={photo.previewUrl} alt={photo.file.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </div>
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{photo.file.name}</span>
              </div>
              <div className="copies-control-row" style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                <button
                  className="btn-copies-mod"
                  onClick={() => onUpdateCopies(photo.id, -1)}
                  aria-label={`Decrease copies count for ${photo.file.name}`}
                  style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700" }}
                >
                  -
                </button>
                <span className="copies-value-badge" style={{ minWidth: "30px", textAlign: "center", display: "inline-block" }}>{photo.copies}</span>
                <button
                  className="btn-copies-mod"
                  onClick={() => onUpdateCopies(photo.id, 1)}
                  aria-label={`Increase copies count for ${photo.file.name}`}
                  style={{ width: "28px", height: "28px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "16px", fontWeight: "700" }}
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Collapsible Arrangement Controls Panel */}
      <div className="controls-panel arrangement-controls-panel" style={{ marginTop: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
          <div 
            onClick={() => setShowSliders((prev) => !prev)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setShowSliders((prev) => !prev);
              }
            }}
            tabIndex={0}
            role="button"
            aria-expanded={showSliders}
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "12px", 
              cursor: "pointer", 
              userSelect: "none"
            }}
          >
            <h3 style={{ fontSize: "16px", fontWeight: 700, color: "#60a5fa", margin: 0 }}>
              🛠️ Edit Borders and gaps
            </h3>
            <span style={{ fontSize: "12px", color: "#9aa3b2", transform: showSliders ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
        </div>

        {showSliders && (
          <div style={{ 
            display: "grid", 
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", 
            gap: "14px", 
            alignItems: "center",
            marginTop: "16px",
            borderTop: "1px solid #2e374e",
            paddingTop: "16px",
            animation: "slideUp 0.2s ease-out"
          }}>
            <div className="control-group">
              <label id="border-width-slider-label">
                <span>Photo Border Width</span>
                <span className="value-badge">{borderWidthMm.toFixed(1)} mm</span>
              </label>
              <div className="slider-row">
                <button
                  className="slider-adj-btn"
                  aria-label="Decrease border width by 0.1"
                  onClick={() => setBorderWidthMm((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))))}
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="5"
                  step="0.1"
                  value={borderWidthMm}
                  aria-labelledby="border-width-slider-label"
                  aria-valuemin={0}
                  aria-valuemax={5}
                  aria-valuenow={borderWidthMm}
                  onChange={(e) => setBorderWidthMm(Number(e.target.value))}
                />
                <button
                  className="slider-adj-btn"
                  aria-label="Increase border width by 0.1"
                  onClick={() => setBorderWidthMm((prev) => Math.min(5, Number((prev + 0.1).toFixed(1))))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="control-group" style={{ gap: 0 }}>
              <label id="border-color-picker-label" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", margin: 0 }}>
                <span>Border Color</span>
                <input
                  type="color"
                  value={borderColor}
                  className="color-swatch-picker"
                  aria-labelledby="border-color-picker-label"
                  onChange={(e) => setBorderColor(e.target.value)}
                  style={{
                    width: "40px",
                    height: "26px",
                    border: "1px solid #384260",
                    borderRadius: "6px",
                    cursor: "pointer",
                    padding: 0
                  }}
                />
              </label>
            </div>

            <div className="control-group">
              <label id="gap-x-slider-label">
                <span>Horizontal Gap</span>
                <span className="value-badge">{gapXMm.toFixed(1)} mm</span>
              </label>
              <div className="slider-row">
                <button
                  className="slider-adj-btn"
                  aria-label="Decrease horizontal gap by 0.1"
                  onClick={() => setGapXMm((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))))}
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={gapXMm}
                  aria-labelledby="gap-x-slider-label"
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={gapXMm}
                  onChange={(e) => setGapXMm(Number(e.target.value))}
                />
                <button
                  className="slider-adj-btn"
                  aria-label="Increase horizontal gap by 0.1"
                  onClick={() => setGapXMm((prev) => Math.min(10, Number((prev + 0.1).toFixed(1))))}
                >
                  +
                </button>
              </div>
            </div>

            <div className="control-group">
              <label id="gap-y-slider-label">
                <span>Vertical Gap</span>
                <span className="value-badge">{gapYMm.toFixed(1)} mm</span>
              </label>
              <div className="slider-row">
                <button
                  className="slider-adj-btn"
                  aria-label="Decrease vertical gap by 0.1"
                  onClick={() => setGapYMm((prev) => Math.max(0, Number((prev - 0.1).toFixed(1))))}
                >
                  -
                </button>
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  value={gapYMm}
                  aria-labelledby="gap-y-slider-label"
                  aria-valuemin={0}
                  aria-valuemax={10}
                  aria-valuenow={gapYMm}
                  onChange={(e) => setGapYMm(Number(e.target.value))}
                />
                <button
                  className="slider-adj-btn"
                  aria-label="Increase vertical gap by 0.1"
                  onClick={() => setGapYMm((prev) => Math.min(10, Number((prev + 0.1).toFixed(1))))}
                >
                  +
                </button>
              </div>
            </div>
          </div>
        )}
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
              columnGap: `${(gapXMm / layout.gridWidthMm) * 100}%`,
              rowGap: `${(gapYMm / layout.gridHeightMm) * 100}%`,
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
                  <div className="photo-container" style={{ background: borderColor }}>
                    <div style={{
                      position: "absolute",
                      left: `${borderWidthMm}mm`,
                      top: `${borderWidthMm}mm`,
                      right: `${borderWidthMm}mm`,
                      bottom: `${borderWidthMm}mm`,
                      overflow: "hidden"
                    }}>
                      <img
                        src={slot.previewUrl}
                        alt="Grid cell"
                        style={imageStyle}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <WizardProgressBar currentStep={currentStep} setCurrentStep={setCurrentStep} photosCount={photos.length} />

      {/* Dynamic Statistics Widgets (Moved below the A4 Sheet preview) */}
      <div className="sheet-stats" style={{ marginTop: "24px" }}>
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
      </div>
    </div>
  );
}
