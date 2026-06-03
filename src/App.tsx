import { useRef, useState, useEffect } from "react";
import AdjustWorkspace from "./components/AdjustWorkspace";
import { CropArea, CropControls } from "./components/CropWorkspace";
import A4SheetPreview from "./components/A4SheetPreview";
import { PhotoDB } from "./utils/photoDb";

type Step = 1 | 2 | 3 | 4;

type PhotoItem = {
  id: string;
  file: File;
  previewUrl: string;

  copies: number;

  // Crop State
  cropX: number;
  cropY: number;
  zoom: number;
  aspect?: number;
  croppedArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  originalWidth?: number;
  originalHeight?: number;

  // Adjust State
  brightness: number;
  contrast: number;
  saturation: number;
};

type StoredProjectMetadata = {
  id: string;
  fileName: string;
  fileType: string;
  copies: number;
  cropX: number;
  cropY: number;
  zoom: number;
  aspect?: number;
  croppedArea?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  brightness: number;
  contrast: number;
  saturation: number;
};

function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [isLoading, setIsLoading] = useState(true);
  
  // Replace file workflow states
  const [pendingReplaceId, setPendingReplaceId] = useState<string | null>(null);
  const [pendingReplacement, setPendingReplacement] = useState<{ id: string; file: File } | null>(null);
  
  // Save visual feedback state
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  // 1. LOAD PROJECT ON STARTUP
  useEffect(() => {
    async function restoreProject() {
      try {
        const stored = localStorage.getItem("passport-photo-sheet-project");
        if (stored) {
          const parsed = JSON.parse(stored);
          const metadataList: StoredProjectMetadata[] = parsed.photosMetadata || [];
          const step: Step = parsed.currentStep || 1;
          const idx: number = parsed.selectedIndex || 0;

          const restoredPhotos: PhotoItem[] = [];
          for (const meta of metadataList) {
            const file = await PhotoDB.getFile(meta.id);
            if (file) {
              restoredPhotos.push({
                id: meta.id,
                file,
                previewUrl: URL.createObjectURL(file),
                copies: meta.copies,
                cropX: meta.cropX,
                cropY: meta.cropY,
                zoom: meta.zoom,
                aspect: meta.aspect,
                croppedArea: meta.croppedArea,
                brightness: meta.brightness,
                contrast: meta.contrast,
                saturation: meta.saturation,
              });
            }
          }

          if (restoredPhotos.length > 0) {
            setPhotos(restoredPhotos);
            setSelectedIndex(Math.min(idx, restoredPhotos.length - 1));
            setCurrentStep(step);
          }
        }
      } catch (err) {
        console.error("Failed to restore project:", err);
      } finally {
        setIsLoading(false);
      }
    }
    restoreProject();
  }, []);

  // 2. AUTO-SAVE METADATA TO LOCALSTORAGE
  useEffect(() => {
    if (isLoading) return;

    const metadataList: StoredProjectMetadata[] = photos.map((p) => ({
      id: p.id,
      fileName: p.file.name,
      fileType: p.file.type,
      copies: p.copies,
      cropX: p.cropX,
      cropY: p.cropY,
      zoom: p.zoom,
      aspect: p.aspect,
      croppedArea: p.croppedArea,
      brightness: p.brightness,
      contrast: p.contrast,
      saturation: p.saturation,
    }));

    localStorage.setItem(
      "passport-photo-sheet-project",
      JSON.stringify({
        currentStep,
        selectedIndex,
        photosMetadata: metadataList,
      })
    );
  }, [photos, selectedIndex, currentStep, isLoading]);

  // 3. UPLOAD ACTION (Limit of 5)
  const handleAddPhotos = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (!files.length) return;

    const remainingSlots = 5 - photos.length;
    const selectedFiles = files.slice(0, remainingSlots);

    const newPhotos: PhotoItem[] = [];
    for (const file of selectedFiles) {
      const id = crypto.randomUUID();
      // Write file blob to IndexedDB
      await PhotoDB.saveFile(id, file);

      newPhotos.push({
        id,
        file,
        previewUrl: URL.createObjectURL(file),
        copies: 6,
        cropX: 0,
        cropY: 0,
        zoom: 1,
        aspect: 35 / 40,
        brightness: 0,
        contrast: 0,
        saturation: 0,
      });
    }

    if (newPhotos.length > 0) {
      setPhotos((prev) => {
        const updated = [...prev, ...newPhotos];
        if (prev.length === 0) {
          setSelectedIndex(0);
        }
        return updated;
      });
    }

    event.target.value = "";
  };

  // 4. PREPARE REPLACE SELECTION
  const triggerReplace = (photoId: string) => {
    setPendingReplaceId(photoId);
    replaceFileInputRef.current?.click();
  };

  const handleReplaceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !pendingReplaceId) return;

    setPendingReplacement({
      id: pendingReplaceId,
      file,
    });

    event.target.value = "";
    setPendingReplaceId(null);
  };

  // Keep Settings Replacement
  const handleKeepSettings = async () => {
    if (!pendingReplacement) return;
    const { id, file } = pendingReplacement;

    // Overwrite blob in IndexedDB
    await PhotoDB.saveFile(id, file);

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              file,
              previewUrl: URL.createObjectURL(file),
            }
          : photo
      )
    );

    setPendingReplacement(null);
    setSaveFeedback("Image Replaced ✓");
    setTimeout(() => setSaveFeedback(null), 1500);
  };

  // Reset Settings Replacement
  const handleResetSettings = async () => {
    if (!pendingReplacement) return;
    const { id, file } = pendingReplacement;

    // Overwrite blob in IndexedDB
    await PhotoDB.saveFile(id, file);

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              file,
              previewUrl: URL.createObjectURL(file),
              cropX: 0,
              cropY: 0,
              zoom: 1,
              aspect: 35 / 40,
              croppedArea: undefined,
              brightness: 0,
              contrast: 0,
              saturation: 0,
            }
          : photo
      )
    );

    setPendingReplacement(null);
    setSaveFeedback("Image Replaced & Reset ✓");
    setTimeout(() => setSaveFeedback(null), 1500);
  };

  // 5. DELETE PHOTO ACTION
  const handleDeletePhoto = async (id: string) => {
    // Delete binary blob from IndexedDB
    await PhotoDB.deleteFile(id);

    setPhotos((prev) => {
      const deleteIndex = prev.findIndex((p) => p.id === id);
      const updated = prev.filter((p) => p.id !== id);

      if (updated.length === 0) {
        setCurrentStep(1);
        setSelectedIndex(0);
      } else {
        if (selectedIndex === deleteIndex) {
          // Select previous if possible, otherwise first available index (0)
          const newIdx = Math.max(0, deleteIndex - 1);
          setSelectedIndex(newIdx);
        } else if (selectedIndex > deleteIndex) {
          setSelectedIndex((prevIdx) => prevIdx - 1);
        }
      }
      return updated;
    });
  };

  // 6. UPDATE COPIES IN STEP 1
  const updateCopiesCount = (id: string, change: number) => {
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, copies: Math.max(0, p.copies + change) } : p
      )
    );
  };

  // 7. CROP WORKSPACE MUTATIONS (Auto-saves instantly to photos state)
  const updateCrop = (crop: { x: number; y: number }) => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              cropX: crop.x,
              cropY: crop.y,
            }
          : photo
      )
    );
  };

  const updateZoom = (zoom: number) => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              zoom,
            }
          : photo
      )
    );
  };

  const updateAspect = (aspect: number | undefined) => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              aspect,
            }
          : photo
      )
    );
  };

  const updateCropComplete = (
    croppedArea: { x: number; y: number; width: number; height: number },
    _croppedAreaPixels: { x: number; y: number; width: number; height: number }
  ) => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              croppedArea,
            }
          : photo
      )
    );
  };

  const resetCrop = () => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              cropX: 0,
              cropY: 0,
              zoom: 1,
              aspect: 35 / 40,
              croppedArea: undefined,
            }
          : photo
      )
    );
    setSaveFeedback("Crop Reset ✓");
    setTimeout(() => setSaveFeedback(null), 1500);
  };

  // 8. ADJUST WORKSPACE MUTATIONS (Auto-saves instantly to photos state)
  const applyAdjustmentPreset = (preset: {
    brightness: number;
    contrast: number;
    saturation: number;
  }) => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              brightness: preset.brightness,
              contrast: preset.contrast,
              saturation: preset.saturation,
            }
          : photo
      )
    );
  };

  const updateAdjustment = (
    key: "brightness" | "contrast" | "saturation",
    value: number
  ) => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              [key]: value,
            }
          : photo
      )
    );
  };

  const resetAdjustments = () => {
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              brightness: 0,
              contrast: 0,
              saturation: 0,
            }
          : photo
      )
    );
    setSaveFeedback("Adjustments Reset ✓");
    setTimeout(() => setSaveFeedback(null), 1500);
  };

  // 9. NAVIGATION HELPERS
  const goPrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goNext = () => {
    setSelectedIndex((prev) => (prev < photos.length - 1 ? prev + 1 : prev));
  };

  const triggerSaveFeedback = () => {
    setSaveFeedback(currentStep === 2 ? "Crop Saved ✓" : "Adjustments Saved ✓");
    setTimeout(() => setSaveFeedback(null), 1500);
  };

  const handleSaveAndNext = () => {
    setSaveFeedback(currentStep === 2 ? "Crop Saved ✓" : "Adjustments Saved ✓");
    setTimeout(() => setSaveFeedback(null), 1500);

    if (selectedIndex < photos.length - 1) {
      setSelectedIndex((prev) => prev + 1);
    } else {
      if (currentStep === 2) {
        setCurrentStep(3);
        setSelectedIndex(0);
      } else if (currentStep === 3) {
        setCurrentStep(4);
        setSelectedIndex(0);
      }
    }
  };

  const selectedPhoto = photos[selectedIndex];

  // Render cropper image or adjustment preview image
  const renderWorkspace = () => {
    if (!selectedPhoto) {
      return <div className="empty-preview">No photo selected</div>;
    }

    if (currentStep === 3) {
      return (
        <img
          src={selectedPhoto.previewUrl}
          alt="Adjust preview"
          className="preview-image"
          style={{
            filter: `
              brightness(${100 + selectedPhoto.brightness}%)
              contrast(${100 + selectedPhoto.contrast}%)
              saturate(${100 + selectedPhoto.saturation}%)
            `,
          }}
        />
      );
    }

    if (currentStep === 2) {
      return (
        <CropArea
          imageUrl={selectedPhoto.previewUrl}
          crop={{ x: selectedPhoto.cropX, y: selectedPhoto.cropY }}
          zoom={selectedPhoto.zoom}
          aspect={selectedPhoto.aspect}
          onCropChange={updateCrop}
          onZoomChange={updateZoom}
          onCropComplete={updateCropComplete}
        />
      );
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="app loading-screen">
        <div className="loading-card">
          <div className="loading-spinner"></div>
          <h2>Restoring Project Workspace</h2>
          <p>Please wait, loading original photos from safe memory...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="card">
        <h1>Passport Photo Sheet Generator</h1>
        <p className="subtitle">
          Upload, crop, adjust, arrange and export passport photos on A4 paper.
        </p>

        {/* Global replace hidden inputs */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={handleAddPhotos}
          aria-label="Upload photo files"
        />
        <input
          ref={replaceFileInputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={handleReplaceFileChange}
          aria-label="Replace photo file"
        />

        {/* Progress Tracker Header */}
        <div className="wizard-progress-bar" role="navigation" aria-label="Wizard Steps">
          <button
            className={`wizard-step-node ${currentStep === 1 ? "active" : ""} ${
              currentStep > 1 ? "completed" : ""
            }`}
            onClick={() => currentStep > 1 && setCurrentStep(1)}
            disabled={currentStep === 1}
          >
            <span className="step-num">{currentStep > 1 ? "✓" : "1"}</span>
            <span className="step-label">Select</span>
          </button>
          <div className="wizard-step-connector"></div>
          
          <button
            className={`wizard-step-node ${currentStep === 2 ? "active" : ""} ${
              currentStep > 2 ? "completed" : ""
            }`}
            onClick={() => currentStep > 2 && setCurrentStep(2)}
            disabled={photos.length === 0 || currentStep === 2}
          >
            <span className="step-num">{currentStep > 2 ? "✓" : "2"}</span>
            <span className="step-label">Crop</span>
          </button>
          <div className="wizard-step-connector"></div>
          
          <button
            className={`wizard-step-node ${currentStep === 3 ? "active" : ""} ${
              currentStep > 3 ? "completed" : ""
            }`}
            onClick={() => currentStep > 3 && setCurrentStep(3)}
            disabled={photos.length === 0 || currentStep === 3}
          >
            <span className="step-num">{currentStep > 3 ? "✓" : "3"}</span>
            <span className="step-label">Adjust</span>
          </button>
          <div className="wizard-step-connector"></div>
          
          <button
            className={`wizard-step-node ${currentStep === 4 ? "active" : ""}`}
            disabled={photos.length === 0 || currentStep === 4}
            onClick={() => setCurrentStep(4)}
          >
            <span className="step-num">4</span>
            <span className="step-label">Arrange</span>
          </button>
        </div>

        {/* STEP 1: SELECT PHOTOS */}
        {currentStep === 1 && (
          <div className="select-photos-step">
            <div className="select-step-header">
              <h2>Select & Plan Photos</h2>
              <p>Upload up to 5 photos and configure the copy repeats for each sheet page.</p>
            </div>

            <div className="photos-list-grid">
              {photos.map((photo, index) => (
                <div key={photo.id} className="photo-list-card">
                  <div className="photo-card-thumbnail">
                    <img src={photo.previewUrl} alt={`Thumbnail ${index + 1}`} />
                  </div>
                  <div className="photo-card-info">
                    <span className="photo-filename">{photo.file.name}</span>
                    <span className="photo-filesize">
                      {(photo.file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                  <div className="photo-card-copies">
                    <span className="copies-label">Copies:</span>
                    <div className="copies-control-row">
                      <button
                        className="btn-copies-mod"
                        onClick={() => updateCopiesCount(photo.id, -1)}
                        aria-label="Decrease copies count"
                      >
                        -
                      </button>
                      <span className="copies-value-badge">{photo.copies}</span>
                      <button
                        className="btn-copies-mod"
                        onClick={() => updateCopiesCount(photo.id, 1)}
                        aria-label="Increase copies count"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div className="photo-card-actions">
                    <button
                      className="btn-card-action btn-card-replace"
                      onClick={() => triggerReplace(photo.id)}
                    >
                      🔄 Replace
                    </button>
                    <button
                      className="btn-card-action btn-card-delete"
                      onClick={() => handleDeletePhoto(photo.id)}
                    >
                      🗑️ Delete
                    </button>
                  </div>
                </div>
              ))}

              {photos.length < 5 && (
                <button
                  type="button"
                  className="upload-dropzone-card"
                  onClick={() => fileInputRef.current?.click()}
                  aria-label="Add photos button"
                >
                  <span className="dropzone-plus">+</span>
                  <span className="dropzone-text">Add Photo ({photos.length} / 5)</span>
                </button>
              )}
            </div>

            {photos.length > 0 && (
              <div className="step-actions-footer">
                <button
                  className="btn-proceed-crop"
                  onClick={() => {
                    setSelectedIndex(0);
                    setCurrentStep(2);
                  }}
                >
                  Proceed to Crop ➔
                </button>
              </div>
            )}
          </div>
        )}

        {/* STEP 2: CROP PHOTOS */}
        {currentStep === 2 && (
          <div className="crop-step-workspace">
            <div className="step-nav-bar">
              <button className="btn-step-back" onClick={() => setCurrentStep(1)}>
                ← Back to Select
              </button>
              <div className="step-title-indicator">
                <h2>Step 2: Crop Photos</h2>
                <span className="image-counter-badge">
                  Photo {selectedIndex + 1} of {photos.length}
                </span>
              </div>
            </div>

            <div className="workspace-container">
              <div className="preview-container" aria-label="Selected photo crop viewport">
                {renderWorkspace()}
              </div>

              <div className="controls-panel">
                {selectedPhoto && (
                  <CropControls
                    zoom={selectedPhoto.zoom}
                    aspect={selectedPhoto.aspect}
                    onZoomChange={updateZoom}
                    onAspectChange={updateAspect}
                  />
                )}

                {selectedPhoto && (
                  <div className="action-buttons-row">
                    <button
                      className={`btn-action btn-save ${saveFeedback ? "success-flash" : ""}`}
                      onClick={triggerSaveFeedback}
                    >
                      {saveFeedback ? saveFeedback : "Save"}
                    </button>
                    <button className="btn-action btn-save-next" onClick={handleSaveAndNext}>
                      {selectedIndex === photos.length - 1 ? "Save & Next Stage ➔" : "Next Image →"}
                    </button>
                    <button className="btn-action btn-retry" onClick={resetCrop}>
                      ↺ Reset Crop
                    </button>
                    <button className="btn-action btn-replace" onClick={() => triggerReplace(selectedPhoto.id)}>
                      🔄 Replace Image
                    </button>
                    <button className="btn-action btn-delete" onClick={() => handleDeletePhoto(selectedPhoto.id)}>
                      🗑️ Delete Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation arrows row */}
            <div className="navigation-arrows-row">
              <button
                className="btn-nav-arrow"
                disabled={selectedIndex === 0}
                onClick={goPrevious}
              >
                ◀ Previous Photo
              </button>
              <button
                className="btn-nav-arrow"
                disabled={selectedIndex === photos.length - 1}
                onClick={goNext}
              >
                Next Photo ▶
              </button>
            </div>

            {/* Quick jump thumbnail strip */}
            <div className="thumbnail-strip" role="list" aria-label="Photo thumbnails library">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  role="listitem"
                  className={`thumbnail-card ${selectedIndex === index ? "selected" : ""}`}
                  aria-label={`Photo thumbnail ${index + 1}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <img src={photo.previewUrl} alt={`Thumbnail ${index + 1}`} />
                  <span>Copies: {photo.copies}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: ADJUST COLORS */}
        {currentStep === 3 && (
          <div className="adjust-step-workspace">
            <div className="step-nav-bar">
              <button className="btn-step-back" onClick={() => setCurrentStep(2)}>
                ← Back to Crop
              </button>
              <div className="step-title-indicator">
                <h2>Step 3: Adjust Photos</h2>
                <span className="image-counter-badge">
                  Photo {selectedIndex + 1} of {photos.length}
                </span>
              </div>
            </div>

            <div className="workspace-container">
              <div className="preview-container" aria-label="Selected photo adjustment viewport">
                {renderWorkspace()}
              </div>

              <div className="controls-panel">
                {selectedPhoto && (
                  <AdjustWorkspace
                    brightness={selectedPhoto.brightness}
                    contrast={selectedPhoto.contrast}
                    saturation={selectedPhoto.saturation}
                    onBrightnessChange={(value) => updateAdjustment("brightness", value)}
                    onContrastChange={(value) => updateAdjustment("contrast", value)}
                    onSaturationChange={(value) => updateAdjustment("saturation", value)}
                    onApplyPreset={applyAdjustmentPreset}
                    onResetAll={resetAdjustments}
                  />
                )}

                {selectedPhoto && (
                  <div className="action-buttons-row">
                    <button
                      className={`btn-action btn-save ${saveFeedback ? "success-flash" : ""}`}
                      onClick={triggerSaveFeedback}
                    >
                      {saveFeedback ? saveFeedback : "Save"}
                    </button>
                    <button className="btn-action btn-save-next" onClick={handleSaveAndNext}>
                      {selectedIndex === photos.length - 1 ? "Save & Next Stage ➔" : "Next Image →"}
                    </button>
                    <button className="btn-action btn-retry" onClick={resetAdjustments}>
                      ↺ Reset Adjustments
                    </button>
                    <button className="btn-action btn-replace" onClick={() => triggerReplace(selectedPhoto.id)}>
                      🔄 Replace Image
                    </button>
                    <button className="btn-action btn-delete" onClick={() => handleDeletePhoto(selectedPhoto.id)}>
                      🗑️ Delete Image
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Navigation arrows row */}
            <div className="navigation-arrows-row">
              <button
                className="btn-nav-arrow"
                disabled={selectedIndex === 0}
                onClick={goPrevious}
              >
                ◀ Previous Photo
              </button>
              <button
                className="btn-nav-arrow"
                disabled={selectedIndex === photos.length - 1}
                onClick={goNext}
              >
                Next Photo ▶
              </button>
            </div>

            {/* Quick jump thumbnail strip */}
            <div className="thumbnail-strip" role="list" aria-label="Photo thumbnails library">
              {photos.map((photo, index) => (
                <button
                  key={photo.id}
                  type="button"
                  role="listitem"
                  className={`thumbnail-card ${selectedIndex === index ? "selected" : ""}`}
                  aria-label={`Photo thumbnail ${index + 1}`}
                  onClick={() => setSelectedIndex(index)}
                >
                  <img src={photo.previewUrl} alt={`Thumbnail ${index + 1}`} />
                  <span>Copies: {photo.copies}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 4: ARRANGE & EXPORT (Untouched layout preview integration) */}
        {currentStep === 4 && (
          <div className="arrange-step-workspace">
            <div className="step-nav-bar">
              <button className="btn-step-back" onClick={() => setCurrentStep(3)}>
                ← Back to Adjust
              </button>
              <div className="step-title-indicator">
                <h2>Step 4: Arrange & Export</h2>
              </div>
            </div>
            
            <A4SheetPreview photos={photos} />
          </div>
        )}

        {/* REPLACE SETTINGS MODAL */}
        {pendingReplacement && (
          <div className="replace-modal-backdrop">
            <div className="replace-modal-card">
              <h3>Replace Photo Options</h3>
              <p>Do you want to keep the existing crop boundaries and filter values for this replacement photo, or reset them to defaults?</p>
              <div className="replace-modal-actions">
                <button className="btn-modal btn-modal-keep" onClick={handleKeepSettings}>
                  Keep Previous Settings
                </button>
                <button className="btn-modal btn-modal-reset" onClick={handleResetSettings}>
                  Reset For New Image
                </button>
                <button className="btn-modal btn-modal-cancel" onClick={() => setPendingReplacement(null)}>
                  Cancel Replacement
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default App;