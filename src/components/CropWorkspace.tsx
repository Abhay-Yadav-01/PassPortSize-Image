import { useState, useEffect, useRef, useCallback } from "react";
import ReactCrop, { type Crop, type PixelCrop, type PercentCrop } from "react-image-crop";
import Cropper from "react-easy-crop";
import "react-image-crop/dist/ReactCrop.css";
import { calculateCenteredCropArea } from "../utils/cropMigration";
import { PHOTO_TEMPLATES, getTemplateByAspect } from "../utils/templates";

type CropAreaProps = {
  imageUrl: string;
  croppedArea: { x: number; y: number; width: number; height: number } | undefined;
  aspect: number | undefined;
  cropX: number;
  cropY: number;
  zoom: number;
  originalWidth: number | undefined;
  originalHeight: number | undefined;
  onCropChange: (crop: { x: number; y: number }) => void;
  onZoomChange: (zoom: number) => void;
  onCropComplete: (croppedArea: { x: number; y: number; width: number; height: number }) => void;
};

interface SVGGuidesOverlayProps {
  guide: {
    eyeLineY: number;
    headMinY: number;
    headMaxY: number;
    chinY: number;
  };
  crop: { x: number; y: number; width: number; height: number };
}

export function SVGGuidesOverlay({ guide, crop }: SVGGuidesOverlayProps) {
  const { eyeLineY, headMinY, chinY } = guide;

  return (
    <div
      style={{
        position: "absolute",
        left: `${crop.x}%`,
        top: `${crop.y}%`,
        width: `${crop.width}%`,
        height: `${crop.height}%`,
        pointerEvents: "none",
        border: "1.5px solid rgba(59, 130, 246, 0.6)",
        boxSizing: "border-box",
        zIndex: 10,
      }}
    >
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        style={{ display: "block" }}
      >
        {/* Face Oval Silhouette */}
        <ellipse
          cx="50"
          cy={(headMinY + chinY) / 2}
          rx="24"
          ry={(chinY - headMinY) / 2}
          stroke="#10b981"
          strokeWidth="1.2"
          strokeDasharray="4 3"
          fill="rgba(16, 185, 129, 0.05)"
        />

        {/* Eye Line */}
        <line
          x1="5"
          y1={eyeLineY}
          x2="95"
          y2={eyeLineY}
          stroke="#3b82f6"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />

        {/* Chin Line */}
        <line
          x1="5"
          y1={chinY}
          x2="95"
          y2={chinY}
          stroke="#ef4444"
          strokeWidth="1.2"
          strokeDasharray="3 3"
        />

        {/* Head Top Limit */}
        <line
          x1="25"
          y1={headMinY}
          x2="75"
          y2={headMinY}
          stroke="#eab308"
          strokeWidth="1"
          strokeDasharray="2 2"
        />
      </svg>

      {/* HTML Absolute Badges */}
      <span
        style={{
          position: "absolute",
          left: "6px",
          top: `calc(${eyeLineY}% - 14px)`,
          fontSize: "9px",
          fontWeight: 700,
          color: "#93c5fd",
          background: "rgba(12, 14, 18, 0.85)",
          padding: "2px 4px",
          borderRadius: "3px",
          border: "1px solid rgba(59, 130, 246, 0.3)",
          whiteSpace: "nowrap",
        }}
      >
        Eyes Line
      </span>

      <span
        style={{
          position: "absolute",
          right: "6px",
          top: `calc(${chinY}% - 14px)`,
          fontSize: "9px",
          fontWeight: 700,
          color: "#fca5a5",
          background: "rgba(12, 14, 18, 0.85)",
          padding: "2px 4px",
          borderRadius: "3px",
          border: "1px solid rgba(239, 68, 68, 0.3)",
          whiteSpace: "nowrap",
        }}
      >
        Chin Line
      </span>

      <span
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          top: `calc(${headMinY}% - 14px)`,
          fontSize: "8px",
          fontWeight: 700,
          color: "#fef08a",
          background: "rgba(12, 14, 18, 0.85)",
          padding: "1px 4px",
          borderRadius: "3px",
          border: "1px solid rgba(234, 179, 8, 0.3)",
          whiteSpace: "nowrap",
        }}
      >
        Head Top
      </span>
    </div>
  );
}

export function CropArea({
  imageUrl,
  croppedArea,
  aspect,
  cropX,
  cropY,
  zoom,
  originalWidth,
  originalHeight,
  onCropChange,
  onZoomChange,
  onCropComplete,
}: CropAreaProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [cropAreaBounds, setCropAreaBounds] = useState<{ left: number; top: number; width: number; height: number } | null>(null);
  const activeTemplate = getTemplateByAspect(aspect);

  // Measure crop area bounds for react-easy-crop
  useEffect(() => {
    if (aspect === undefined) {
      setCropAreaBounds(null);
      return;
    }

    const updateBounds = () => {
      if (!containerRef.current) return;
      const cropAreaEl = containerRef.current.querySelector(".react-easy-crop__crop-area") as HTMLElement | null;
      if (cropAreaEl) {
        const newLeft = cropAreaEl.offsetLeft;
        const newTop = cropAreaEl.offsetTop;
        const newWidth = cropAreaEl.offsetWidth;
        const newHeight = cropAreaEl.offsetHeight;

        setCropAreaBounds((prev) => {
          if (
            prev &&
            prev.left === newLeft &&
            prev.top === newTop &&
            prev.width === newWidth &&
            prev.height === newHeight
          ) {
            return prev;
          }
          return { left: newLeft, top: newTop, width: newWidth, height: newHeight };
        });
      }
    };

    // Defer updateBounds to next frame to prevent React state update warning during rendering/layout
    const rafId = requestAnimationFrame(updateBounds);

    const observer = new ResizeObserver(() => {
      updateBounds();
    });

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [aspect, imageUrl]);

  // Synchronize or initialize crop state when image or aspect changes (for react-image-crop / Free Crop)
  useEffect(() => {
    if (aspect !== undefined) return; // Managed by react-easy-crop

    if (croppedArea) {
      setCrop({
        unit: "%",
        x: croppedArea.x,
        y: croppedArea.y,
        width: croppedArea.width,
        height: croppedArea.height,
      });
    } else if (imgRef.current && imgRef.current.complete) {
      const { naturalWidth, naturalHeight } = imgRef.current;
      const centered = calculateCenteredCropArea(naturalWidth, naturalHeight, aspect);
      const newCrop: Crop = {
        unit: "%",
        ...centered,
      };
      setCrop(newCrop);
      onCropComplete(centered);
    }
  }, [imageUrl, aspect, croppedArea]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    if (aspect !== undefined) return; // Managed by react-easy-crop
    const { naturalWidth, naturalHeight } = e.currentTarget;
    if (!croppedArea) {
      const centered = calculateCenteredCropArea(naturalWidth, naturalHeight, aspect);
      const newCrop: Crop = {
        unit: "%",
        ...centered,
      };
      setCrop(newCrop);
      onCropComplete(centered);
    }
  };

  const handleFreeCropComplete = (_pixelCrop: PixelCrop, percentageCrop: PercentCrop) => {
    if (percentageCrop.width && percentageCrop.height) {
      onCropComplete({
        x: percentageCrop.x,
        y: percentageCrop.y,
        width: percentageCrop.width,
        height: percentageCrop.height,
      });
    }
  };

  const handleCropperComplete = useCallback((
    croppedAreaPercentage: { x: number; y: number; width: number; height: number },
    _croppedAreaPixels: { x: number; y: number; width: number; height: number }
  ) => {
    if (croppedAreaPercentage.width && croppedAreaPercentage.height) {
      onCropComplete({
        x: croppedAreaPercentage.x,
        y: croppedAreaPercentage.y,
        width: croppedAreaPercentage.width,
        height: croppedAreaPercentage.height,
      });
    }
  }, [onCropComplete]);

  // Convert croppedArea into image pixels for react-easy-crop initial layout.
  // Keep initialPixels stable while editing the same image/aspect to prevent react-easy-crop infinite recalculation loops.
  const lastKeyRef = useRef<string>("");
  const initialPixelsRef = useRef<{ x: number; y: number; width: number; height: number } | undefined>(undefined);

  const currentKey = `${imageUrl}_${aspect ?? "free"}`;
  if (lastKeyRef.current !== currentKey) {
    lastKeyRef.current = currentKey;
    if (croppedArea && originalWidth && originalHeight) {
      initialPixelsRef.current = {
        x: (croppedArea.x / 100) * originalWidth,
        y: (croppedArea.y / 100) * originalHeight,
        width: (croppedArea.width / 100) * originalWidth,
        height: (croppedArea.height / 100) * originalHeight,
      };
    } else {
      initialPixelsRef.current = undefined;
    }
  }
  const initialPixels = initialPixelsRef.current;

  return (
    <div 
      ref={containerRef}
      className="crop-area" 
      style={{ 
        display: "flex", 
        justifyContent: "center", 
        alignItems: "center", 
        width: "100%", 
        height: "100%", 
        overflow: "hidden", 
        position: "relative",
      }}
    >
      {aspect !== undefined ? (
        <>
          <Cropper
            image={imageUrl}
            crop={{ x: cropX, y: cropY }}
            zoom={zoom}
            aspect={aspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={handleCropperComplete}
            initialCroppedAreaPixels={initialPixels}
          />
          {cropAreaBounds && containerRef.current && activeTemplate.guides && (
            <SVGGuidesOverlay
              guide={activeTemplate.guides}
              crop={{
                x: (cropAreaBounds.left / containerRef.current.offsetWidth) * 100,
                y: (cropAreaBounds.top / containerRef.current.offsetHeight) * 100,
                width: (cropAreaBounds.width / containerRef.current.offsetWidth) * 100,
                height: (cropAreaBounds.height / containerRef.current.offsetHeight) * 100,
              }}
            />
          )}
        </>
      ) : (
        crop && (
          <ReactCrop
            crop={crop}
            onChange={(c) => setCrop(c)}
            onComplete={handleFreeCropComplete}
            aspect={aspect}
            style={{ 
              maxHeight: "100%", 
              maxWidth: "100%",
            }}
          >
            <img
              ref={imgRef}
              src={imageUrl}
              alt="Crop area preview"
              onLoad={onImageLoad}
            />
            {crop.width && crop.height && activeTemplate.guides && (
              <SVGGuidesOverlay
                guide={activeTemplate.guides}
                crop={{ x: crop.x || 0, y: crop.y || 0, width: crop.width, height: crop.height }}
              />
            )}
          </ReactCrop>
        )
      )}
    </div>
  );
}

type CropControlsProps = {
  aspect: number | undefined;
  onAspectChange: (aspect: number | undefined) => void;
};

export function CropControls({
  aspect,
  onAspectChange,
}: CropControlsProps) {
  const [showAspects, setShowAspects] = useState(false);
  const activeTemplate = getTemplateByAspect(aspect);

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
            <span className="value-badge">{activeTemplate.name}</span>
            <span style={{ fontSize: "10px", color: "#9aa3b2", transform: showAspects ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
        </label>
        {showAspects && (
          <div className="aspect-buttons" role="group" aria-labelledby="aspect-ratio-label" style={{ marginTop: "12px" }}>
            {PHOTO_TEMPLATES.map((tmpl) => (
              <button
                key={tmpl.id}
                className={(tmpl.id === "free" && aspect === undefined) || (tmpl.id !== "free" && aspect !== undefined && Math.abs(tmpl.aspect - aspect) < 0.01) ? "active" : ""}
                onClick={() => {
                  onAspectChange(tmpl.id === "free" ? undefined : tmpl.aspect);
                  setShowAspects(false);
                }}
              >
                {tmpl.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}