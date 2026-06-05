import { useState } from "react";

export type PresetType = {
  name: string;
  brightness: number;
  contrast: number;
  saturation: number;
};

export const ADJUSTMENT_PRESETS: Record<string, PresetType> = {
  normal: { name: "Normal", brightness: 0, contrast: 0, saturation: 0 },
  passport: { name: "Passport", brightness: 10, contrast: 8, saturation: 5 },
  bright: { name: "Bright", brightness: 15, contrast: 5, saturation: 10 },
  studio: { name: "Studio", brightness: 8, contrast: 12, saturation: -5 },
  document: { name: "Document", brightness: 5, contrast: 15, saturation: -15 },
};

type AdjustWorkspaceProps = {
  brightness: number;
  contrast: number;
  saturation: number;

  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
  onSaturationChange: (value: number) => void;
  onResetAll: () => void;
};

function AdjustWorkspace({
  brightness,
  contrast,
  saturation,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onResetAll,
}: AdjustWorkspaceProps) {
  // Accordion state to collapse/expand slider rows (defaults to brightness open)
  const [activeEdit, setActiveEdit] = useState<"brightness" | "contrast" | "saturation" | null>("brightness");

  const handleToggle = (type: "brightness" | "contrast" | "saturation") => {
    setActiveEdit((prev) => (prev === type ? null : type));
  };

  const formatValue = (val: number) => (val >= 0 ? `+${val}` : `${val}`);

  return (
    <div className="adjust-workspace">

      {/* Brightness Adjustment row */}
      <div className="control-group" style={{ background: "#141722", padding: "12px 16px", borderRadius: "10px", border: "1px solid #2e374e" }}>
        <label 
          id="brightness-label"
          onClick={() => handleToggle("brightness")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle("brightness");
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={activeEdit === "brightness"}
          style={{ cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", margin: 0 }}
        >
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>Brightness</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="value-badge">{formatValue(brightness)}</span>
            <span style={{ fontSize: "10px", color: "#9aa3b2", transform: activeEdit === "brightness" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
        </label>
        {activeEdit === "brightness" && (
          <div className="slider-row" style={{ marginTop: "12px" }}>
            <button
              className="slider-adj-btn"
              aria-label="Decrease brightness by 2"
              onClick={() => onBrightnessChange(Math.max(-100, brightness - 2))}
            >
              -
            </button>
            <input
              type="range"
              min="-100"
              max="100"
              value={brightness}
              aria-labelledby="brightness-label"
              aria-valuemin={-100}
              aria-valuemax={100}
              aria-valuenow={brightness}
              onChange={(e) => onBrightnessChange(Number(e.target.value))}
            />
            <button
              className="slider-adj-btn"
              aria-label="Increase brightness by 2"
              onClick={() => onBrightnessChange(Math.min(100, brightness + 2))}
            >
              +
            </button>
            <button
              className="slider-reset-btn"
              aria-label="Reset brightness to 0"
              onClick={() => onBrightnessChange(0)}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Contrast Adjustment row */}
      <div className="control-group" style={{ background: "#141722", padding: "12px 16px", borderRadius: "10px", border: "1px solid #2e374e" }}>
        <label 
          id="contrast-label"
          onClick={() => handleToggle("contrast")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle("contrast");
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={activeEdit === "contrast"}
          style={{ cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", margin: 0 }}
        >
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>Contrast</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="value-badge">{formatValue(contrast)}</span>
            <span style={{ fontSize: "10px", color: "#9aa3b2", transform: activeEdit === "contrast" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
        </label>
        {activeEdit === "contrast" && (
          <div className="slider-row" style={{ marginTop: "12px" }}>
            <button
              className="slider-adj-btn"
              aria-label="Decrease contrast by 2"
              onClick={() => onContrastChange(Math.max(-100, contrast - 2))}
            >
              -
            </button>
            <input
              type="range"
              min="-100"
              max="100"
              value={contrast}
              aria-labelledby="contrast-label"
              aria-valuemin={-100}
              aria-valuemax={100}
              aria-valuenow={contrast}
              onChange={(e) => onContrastChange(Number(e.target.value))}
            />
            <button
              className="slider-adj-btn"
              aria-label="Increase contrast by 2"
              onClick={() => onContrastChange(Math.min(100, contrast + 2))}
            >
              +
            </button>
            <button
              className="slider-reset-btn"
              aria-label="Reset contrast to 0"
              onClick={() => onContrastChange(0)}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Saturation Adjustment row */}
      <div className="control-group" style={{ background: "#141722", padding: "12px 16px", borderRadius: "10px", border: "1px solid #2e374e" }}>
        <label 
          id="saturation-label"
          onClick={() => handleToggle("saturation")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleToggle("saturation");
            }
          }}
          tabIndex={0}
          role="button"
          aria-expanded={activeEdit === "saturation"}
          style={{ cursor: "pointer", userSelect: "none", display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", margin: 0 }}
        >
          <span style={{ fontSize: "14px", fontWeight: "600", color: "#e2e8f0" }}>Saturation</span>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className="value-badge">{formatValue(saturation)}</span>
            <span style={{ fontSize: "10px", color: "#9aa3b2", transform: activeEdit === "saturation" ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>▼</span>
          </div>
        </label>
        {activeEdit === "saturation" && (
          <div className="slider-row" style={{ marginTop: "12px" }}>
            <button
              className="slider-adj-btn"
              aria-label="Decrease saturation by 2"
              onClick={() => onSaturationChange(Math.max(-100, saturation - 2))}
            >
              -
            </button>
            <input
              type="range"
              min="-100"
              max="100"
              value={saturation}
              aria-labelledby="saturation-label"
              aria-valuemin={-100}
              aria-valuemax={100}
              aria-valuenow={saturation}
              onChange={(e) => onSaturationChange(Number(e.target.value))}
            />
            <button
              className="slider-adj-btn"
              aria-label="Increase saturation by 2"
              onClick={() => onSaturationChange(Math.min(100, saturation + 2))}
            >
              +
            </button>
            <button
              className="slider-reset-btn"
              aria-label="Reset saturation to 0"
              onClick={() => onSaturationChange(0)}
            >
              Reset
            </button>
          </div>
        )}
      </div>

      {/* Reset All Adjustments */}
      <button 
        className="reset-all-sliders-btn" 
        aria-label="Reset all adjustment sliders to 0"
        onClick={onResetAll}
        style={{ marginTop: "12px" }}
      >
        ↺ Reset All Sliders
      </button>
    </div>
  );
}

export default AdjustWorkspace;