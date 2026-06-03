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
  onApplyPreset: (preset: PresetType) => void;
  onResetAll: () => void;
};

function AdjustWorkspace({
  brightness,
  contrast,
  saturation,
  onBrightnessChange,
  onContrastChange,
  onSaturationChange,
  onApplyPreset,
  onResetAll,
}: AdjustWorkspaceProps) {
  // Detect active preset if current values match
  const activePresetKey = Object.entries(ADJUSTMENT_PRESETS).find(
    ([_, preset]) =>
      preset.brightness === brightness &&
      preset.contrast === contrast &&
      preset.saturation === saturation
  )?.[0];

  const formatValue = (val: number) => (val >= 0 ? `+${val}` : `${val}`);

  return (
    <div className="adjust-workspace">
      {/* Presets Selection Row */}
      <div className="control-group">
        <label id="adjust-presets-label">Adjustment Presets</label>
        <div className="presets-row" role="group" aria-labelledby="adjust-presets-label">
          {Object.entries(ADJUSTMENT_PRESETS).map(([key, preset]) => (
            <button
              key={key}
              className={`preset-btn ${activePresetKey === key ? "active" : ""}`}
              aria-pressed={activePresetKey === key}
              onClick={() => onApplyPreset(preset)}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Brightness Adjustment row */}
      <div className="control-group">
        <label id="brightness-label">
          <span>Brightness</span>
          <span className="value-badge">{formatValue(brightness)}</span>
        </label>
        <div className="slider-row">
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
      </div>

      {/* Contrast Adjustment row */}
      <div className="control-group">
        <label id="contrast-label">
          <span>Contrast</span>
          <span className="value-badge">{formatValue(contrast)}</span>
        </label>
        <div className="slider-row">
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
      </div>

      {/* Saturation Adjustment row */}
      <div className="control-group">
        <label id="saturation-label">
          <span>Saturation</span>
          <span className="value-badge">{formatValue(saturation)}</span>
        </label>
        <div className="slider-row">
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
      </div>

      {/* Reset All Adjustments */}
      <button 
        className="reset-all-sliders-btn" 
        aria-label="Reset all adjustment sliders to 0"
        onClick={onResetAll}
      >
        ↺ Reset All Sliders
      </button>
    </div>
  );
}

export default AdjustWorkspace;