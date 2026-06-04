import { useState } from "react";
import Cropper from "react-easy-crop";

type CropAreaProps = {
  imageUrl: string;
  crop: { x: number; y: number };
  zoom: number;
  aspect: number | undefined;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: any, croppedAreaPixels: any) => void;
};

export function CropArea({
  imageUrl,
  crop,
  zoom,
  aspect,
  onCropChange,
  onZoomChange,
  onCropComplete,
}: CropAreaProps) {
  return (
    <div className="crop-area">
      <Cropper
        image={imageUrl}
        crop={crop}
        zoom={zoom}
        aspect={aspect}
        onCropChange={onCropChange}
        onZoomChange={onZoomChange}
        onCropComplete={onCropComplete}
      />
    </div>
  );
}

type CropControlsProps = {
  zoom: number;
  aspect: number | undefined;
  onZoomChange: (zoom: number) => void;
  onAspectChange: (aspect: number | undefined) => void;
};

export function CropControls({
  zoom,
  aspect,
  onZoomChange,
  onAspectChange,
}: CropControlsProps) {
  const [showAspects, setShowAspects] = useState(false);

  const getAspectLabel = (val: number | undefined) => {
    if (val === 35 / 40) return "3.5×4 cm (Passport)";
    if (val === 35 / 45) return "3.5×4.5 cm (Visa)";
    if (val === 1) return "2×2 in (US Visa)";
    return "Free";
  };

  return (
    <div className="crop-controls">
      {/* Collapsible Aspect Ratio Accordion */}
      <div className="control-group" style={{ background: "#141722", padding: "12px 16px", borderRadius: "10px", border: "1px solid #2e374e" }}>
        <label 
          id="aspect-ratio-label"
          onClick={() => setShowAspects((prev) => !prev)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setShowAspects((prev) => !prev);
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={showAspects}
          style={{ cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", margin: 0 }}
        >
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>Change aspect ratio</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="value-badge">{getAspectLabel(aspect)}</span>
            <span style={{ fontSize: "10px", color: "#9aa3b2", transform: showAspects ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
        </label>
        {showAspects && (
          <div className="aspect-buttons" role="group" aria-labelledby="aspect-ratio-label" style={{ marginTop: "12px" }}>
            <button
              className={aspect === 35 / 40 ? "active" : ""}
              aria-pressed={aspect === 35 / 40}
              onClick={() => {
                onAspectChange(35 / 40);
                setShowAspects(false);
              }}
            >
              3.5×4 cm (Passport)
            </button>
            <button
              className={aspect === 35 / 45 ? "active" : ""}
              aria-pressed={aspect === 35 / 45}
              onClick={() => {
                onAspectChange(35 / 45);
                setShowAspects(false);
              }}
            >
              3.5×4.5 cm (Visa)
            </button>
            <button
              className={aspect === 1 ? "active" : ""}
              aria-pressed={aspect === 1}
              onClick={() => {
                onAspectChange(1);
                setShowAspects(false);
              }}
            >
              2×2 in (US Visa)
            </button>
            <button
              className={aspect === undefined ? "active" : ""}
              aria-pressed={aspect === undefined}
              onClick={() => {
                onAspectChange(undefined);
                setShowAspects(false);
              }}
            >
              Free
            </button>
          </div>
        )}
      </div>

      <div className="control-group">
        <label id="zoom-slider-label">Zoom: {zoom.toFixed(1)}x</label>
        <input
          type="range"
          min="1"
          max="3"
          step="0.1"
          value={zoom}
          aria-labelledby="zoom-slider-label"
          aria-valuemin={1}
          aria-valuemax={3}
          aria-valuenow={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
        />
      </div>
    </div>
  );
}