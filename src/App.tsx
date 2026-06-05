import { useRef, useState, useEffect, useCallback } from "react";
import AdjustWorkspace from "./components/AdjustWorkspace";
import { CropArea, CropControls } from "./components/CropWorkspace";
import A4SheetPreview from "./components/A4SheetPreview";
import { PhotoDB } from "./utils/photoDb";
import WizardProgressBar from "./components/WizardProgressBar";
import { getImageDimensions, calculateCenteredCropArea, adjustCropAreaAspect } from "./utils/cropMigration";

type Step = 1 | 2 | 3 | 4;

export type PhotoItem = {
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

  // Background state
  backgroundRemoved?: boolean;
  bgReplacementColor?: string;
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
  originalWidth?: number;
  originalHeight?: number;
  backgroundRemoved?: boolean;
  bgReplacementColor?: string;
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
          const rawStep = parsed.currentStep || 1;
          let step: Step = 1;
          if (rawStep === 5) {
            step = 4;
          } else if (rawStep === 4) {
            step = 2;
          } else {
            step = rawStep as Step;
          }
          const idx: number = parsed.selectedIndex || 0;

          const restoredPhotos: PhotoItem[] = [];
          for (const meta of metadataList) {
            const file = await PhotoDB.getFile(meta.id);
            if (file) {
              const previewUrl = URL.createObjectURL(file);
              
              // Dynamic loading of image dimensions if missing
              let originalWidth = meta.originalWidth;
              let originalHeight = meta.originalHeight;
              if (originalWidth === undefined || originalHeight === undefined) {
                try {
                  const dims = await getImageDimensions(previewUrl);
                  originalWidth = dims.width;
                  originalHeight = dims.height;
                } catch (e) {
                  console.error("Failed to read image dimensions on restore:", e);
                }
              }

              // Fallback calculation for centered croppedArea if missing in V1
              const croppedArea = meta.croppedArea || calculateCenteredCropArea(
                originalWidth || 0,
                originalHeight || 0,
                meta.aspect ?? 35 / 45
              );

              restoredPhotos.push({
                id: meta.id,
                file,
                previewUrl,
                copies: meta.copies,
                cropX: meta.cropX ?? 0,
                cropY: meta.cropY ?? 0,
                zoom: meta.zoom ?? 1,
                aspect: meta.aspect,
                croppedArea,
                brightness: meta.brightness,
                contrast: meta.contrast,
                saturation: meta.saturation,
                originalWidth,
                originalHeight,
                backgroundRemoved: meta.backgroundRemoved ?? false,
                bgReplacementColor: meta.bgReplacementColor ?? "#ffffff",
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

  // 2. AUTO-SAVE METADATA TO LOCALSTORAGE (Debounced to avoid lag during drag/pan)
  useEffect(() => {
    if (isLoading) return;

    const timer = setTimeout(() => {
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
        originalWidth: p.originalWidth,
        originalHeight: p.originalHeight,
        backgroundRemoved: p.backgroundRemoved ?? false,
        bgReplacementColor: p.bgReplacementColor ?? "#ffffff",
      }));

      localStorage.setItem(
        "passport-photo-sheet-project",
        JSON.stringify({
          currentStep,
          selectedIndex,
          photosMetadata: metadataList,
        })
      );
    }, 1000);

    return () => clearTimeout(timer);
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

      const previewUrl = URL.createObjectURL(file);
      let originalWidth = 0;
      let originalHeight = 0;
      try {
        const dims = await getImageDimensions(previewUrl);
        originalWidth = dims.width;
        originalHeight = dims.height;
      } catch (e) {
        console.error("Failed to read image dimensions on upload:", e);
      }

      newPhotos.push({
        id,
        file,
        previewUrl,
        copies: 6,
        cropX: 0,
        cropY: 0,
        zoom: 1,
        aspect: 35 / 45,
        croppedArea: calculateCenteredCropArea(originalWidth, originalHeight, 35 / 45),
        brightness: 0,
        contrast: 0,
        saturation: 0,
        originalWidth,
        originalHeight,
        backgroundRemoved: false,
        bgReplacementColor: "#ffffff",
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

    const previewUrl = URL.createObjectURL(file);
    let originalWidth = 0;
    let originalHeight = 0;
    try {
      const dims = await getImageDimensions(previewUrl);
      originalWidth = dims.width;
      originalHeight = dims.height;
    } catch (e) {
      console.error("Failed to read dimensions on keep replacement:", e);
    }

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              file,
              previewUrl,
              originalWidth,
              originalHeight,
              croppedArea: calculateCenteredCropArea(originalWidth, originalHeight, photo.aspect),
              backgroundRemoved: false,
              bgReplacementColor: "#ffffff",
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

    const previewUrl = URL.createObjectURL(file);
    let originalWidth = 0;
    let originalHeight = 0;
    try {
      const dims = await getImageDimensions(previewUrl);
      originalWidth = dims.width;
      originalHeight = dims.height;
    } catch (e) {
      console.error("Failed to read dimensions on reset replacement:", e);
    }

    setPhotos((prev) =>
      prev.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              file,
              previewUrl,
              cropX: 0,
              cropY: 0,
              zoom: 1,
              aspect: 35 / 45,
              croppedArea: calculateCenteredCropArea(originalWidth, originalHeight, 35 / 45),
              brightness: 0,
              contrast: 0,
              saturation: 0,
              originalWidth,
              originalHeight,
              backgroundRemoved: false,
              bgReplacementColor: "#ffffff",
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
  const updateCropOffsets = (id: string, crop: { x: number; y: number }) => {
    setPhotos((prev) => {
      const currentPhoto = prev.find((p) => p.id === id);
      if (currentPhoto && Math.abs(currentPhoto.cropX - crop.x) < 0.01 && Math.abs(currentPhoto.cropY - crop.y) < 0.01) {
        return prev;
      }
      return prev.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              cropX: crop.x,
              cropY: crop.y,
            }
          : photo
      );
    });
  };

  const updateCropZoom = (id: string, zoom: number) => {
    setPhotos((prev) => {
      const currentPhoto = prev.find((p) => p.id === id);
      if (currentPhoto && Math.abs(currentPhoto.zoom - zoom) < 0.01) {
        return prev;
      }
      return prev.map((photo) =>
        photo.id === id
          ? {
              ...photo,
              zoom,
            }
          : photo
      );
    });
  };

  const updateAspect = (aspect: number | undefined) => {
    setPhotos((prev) =>
      prev.map((photo, index) => {
        if (index === selectedIndex) {
          const imageWidth = photo.originalWidth ?? 0;
          const imageHeight = photo.originalHeight ?? 0;

          let newCroppedArea = photo.croppedArea;
          if (!newCroppedArea) {
            newCroppedArea = calculateCenteredCropArea(imageWidth, imageHeight, aspect);
          } else {
            newCroppedArea = adjustCropAreaAspect(newCroppedArea, aspect, imageWidth, imageHeight);
          }

          return {
            ...photo,
            aspect,
            croppedArea: newCroppedArea,
            cropX: 0,
            cropY: 0,
            zoom: 1,
          };
        }
        return photo;
      })
    );
  };

  const updateCropComplete = (
    croppedArea: { x: number; y: number; width: number; height: number }
  ) => {
    setPhotos((prev) => {
      const currentPhoto = prev[selectedIndex];
      if (currentPhoto && currentPhoto.croppedArea) {
        const ca = currentPhoto.croppedArea;
        const diffX = Math.abs(ca.x - croppedArea.x);
        const diffY = Math.abs(ca.y - croppedArea.y);
        const diffW = Math.abs(ca.width - croppedArea.width);
        const diffH = Math.abs(ca.height - croppedArea.height);
        
        if (diffX < 0.01 && diffY < 0.01 && diffW < 0.01 && diffH < 0.01) {
          return prev;
        }
      }

      return prev.map((photo, index) => {
        if (index === selectedIndex) {
          if (photo.aspect !== undefined) {
            // Fixed aspect mode: preserve cropX, cropY, zoom
            return {
              ...photo,
              croppedArea,
            };
          } else {
            // Free crop mode: reset pan & zoom
            return {
              ...photo,
              croppedArea,
              cropX: 0,
              cropY: 0,
              zoom: 1,
            };
          }
        }
        return photo;
      });
    });
  };

  const resetCrop = () => {
    const photo = photos[selectedIndex];
    const width = photo?.originalWidth ?? 0;
    const height = photo?.originalHeight ?? 0;
    setPhotos((prev) =>
      prev.map((photo, index) =>
        index === selectedIndex
          ? {
              ...photo,
              cropX: 0,
              cropY: 0,
              zoom: 1,
              aspect: 35 / 45,
              croppedArea: calculateCenteredCropArea(width, height, 35 / 45),
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
  const handleNewProject = async () => {
    if (!window.confirm("Are you sure you want to start a new project? This will delete all uploaded photos and settings.")) {
      return;
    }

    try {
      // 1. Revoke preview URLs to avoid browser memory leaks
      photos.forEach((photo) => {
        URL.revokeObjectURL(photo.previewUrl);
      });

      // 2. Clear IndexedDB
      await PhotoDB.clear();

      // 3. Clear localStorage
      localStorage.removeItem("passport-photo-sheet-project");

      // 4. Reset React States
      setPhotos([]);
      setSelectedIndex(0);
      setCurrentStep(1);

      // 5. Success feedback
      setSaveFeedback("New Project Created ✓");
      setTimeout(() => setSaveFeedback(null), 1500);
    } catch (err) {
      console.error("Failed to clear project:", err);
      alert("Failed to start a new project. Please try again.");
    }
  };

  const goPrevious = () => {
    setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
  };

  const goNext = () => {
    setSelectedIndex((prev) => (prev < photos.length - 1 ? prev + 1 : prev));
  };

  const triggerSaveFeedback = () => {
    setSaveFeedback(
      currentStep === 2
        ? "Crop Saved ✓"
        : "Adjustments Saved ✓"
    );
    setTimeout(() => setSaveFeedback(null), 1500);
  };

  const handleSaveAndNext = () => {
    setSaveFeedback(
      currentStep === 2
        ? "Crop Saved ✓"
        : "Adjustments Saved ✓"
    );
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

  // Memoized handlers to avoid re-creating inline callbacks during dragging
  const handleCropChange = useCallback((crop: { x: number; y: number }) => {
    if (selectedPhoto) {
      updateCropOffsets(selectedPhoto.id, crop);
    }
  }, [selectedPhoto?.id]);

  const handleZoomChange = useCallback((zoom: number) => {
    if (selectedPhoto) {
      updateCropZoom(selectedPhoto.id, zoom);
    }
  }, [selectedPhoto?.id]);

  const handleCropComplete = useCallback((croppedArea: { x: number; y: number; width: number; height: number }) => {
    updateCropComplete(croppedArea);
  }, [selectedIndex]);

  // Render cropper image or adjustment preview image
  const renderWorkspace = () => {
    if (!selectedPhoto) {
      return <div className="empty-preview">No photo selected</div>;
    }

    if (currentStep === 3) {
      const { croppedArea, brightness, contrast, saturation } = selectedPhoto;

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
            objectFit: "contain",
            filter: `
              brightness(${100 + brightness}%)
              contrast(${100 + contrast}%)
              saturate(${100 + saturation}%)
            `,
          };

      const aspect = selectedPhoto.aspect ?? 35 / 45;

      return (
        <div
          className="photo-container"
          style={{
            aspectRatio: aspect,
            width: "auto",
            height: "100%",
            maxHeight: "100%",
            maxWidth: "100%",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <img
            src={selectedPhoto.previewUrl}
            alt="Workspace preview"
            style={imageStyle}
          />
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <CropArea
            imageUrl={selectedPhoto.previewUrl}
            croppedArea={selectedPhoto.croppedArea}
            aspect={selectedPhoto.aspect}
            cropX={selectedPhoto.cropX}
            cropY={selectedPhoto.cropY}
            zoom={selectedPhoto.zoom}
            originalWidth={selectedPhoto.originalWidth}
            originalHeight={selectedPhoto.originalHeight}
            onCropChange={handleCropChange}
            onZoomChange={handleZoomChange}
            onCropComplete={handleCropComplete}
          />

        </div>
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

            <WizardProgressBar currentStep={currentStep} setCurrentStep={setCurrentStep} photosCount={photos.length} />

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
                    aspect={selectedPhoto.aspect}
                    onAspectChange={updateAspect}
                  />
                )}

                {selectedPhoto && (
                  <div className="crop-actions-grid">

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

            <WizardProgressBar currentStep={currentStep} setCurrentStep={setCurrentStep} photosCount={photos.length} />
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
                  <div className="crop-actions-grid">
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

            <WizardProgressBar currentStep={currentStep} setCurrentStep={setCurrentStep} photosCount={photos.length} />
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
            
            <A4SheetPreview 
              photos={photos} 
              onUpdateCopies={updateCopiesCount} 
              currentStep={currentStep}
              setCurrentStep={setCurrentStep}
              onNewProject={handleNewProject}
            />
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