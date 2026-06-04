type Step = 1 | 2 | 3 | 4;

type WizardProgressBarProps = {
  currentStep: Step;
  setCurrentStep: (step: Step) => void;
  photosCount: number;
};

export default function WizardProgressBar({
  currentStep,
  setCurrentStep,
  photosCount
}: WizardProgressBarProps) {
  return (
    <div className="wizard-progress-bar" role="navigation" aria-label="Wizard Steps" style={{ marginTop: "24px", marginBottom: "24px" }}>
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
        disabled={photosCount === 0 || currentStep === 2}
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
        disabled={photosCount === 0 || currentStep === 3}
      >
        <span className="step-num">{currentStep > 3 ? "✓" : "3"}</span>
        <span className="step-label">Adjust</span>
      </button>
      <div className="wizard-step-connector"></div>
      
      <button
        className={`wizard-step-node ${currentStep === 4 ? "active" : ""}`}
        disabled={photosCount === 0 || currentStep === 4}
        onClick={() => setCurrentStep(4)}
      >
        <span className="step-num">4</span>
        <span className="step-label">Arrange</span>
      </button>
    </div>
  );
}
