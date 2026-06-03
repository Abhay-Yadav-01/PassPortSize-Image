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
  return (
    <div className="crop-controls">
      <div className="control-group">
        <label id="aspect-ratio-label">Aspect Ratio</label>
        <div className="aspect-buttons" role="group" aria-labelledby="aspect-ratio-label">
          <button
            className={aspect === 35 / 40 ? "active" : ""}
            aria-pressed={aspect === 35 / 40}
            onClick={() => onAspectChange(35 / 40)}
          >
            3.5×4 cm (Passport)
          </button>
          <button
            className={aspect === 35 / 45 ? "active" : ""}
            aria-pressed={aspect === 35 / 45}
            onClick={() => onAspectChange(35 / 45)}
          >
            3.5×4.5 cm (Visa)
          </button>
          <button
            className={aspect === 1 ? "active" : ""}
            aria-pressed={aspect === 1}
            onClick={() => onAspectChange(1)}
          >
            2×2 in (US Visa)
          </button>
          <button
            className={aspect === undefined ? "active" : ""}
            aria-pressed={aspect === undefined}
            onClick={() => onAspectChange(undefined)}
          >
            Free
          </button>
        </div>
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