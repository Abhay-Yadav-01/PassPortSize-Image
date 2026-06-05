export interface TemplateGuide {
  eyeLineY: number;   // Expected eye level (percentage from crop top, 0-100)
  headMinY: number;   // Bounding box top limit (percentage from crop top, 0-100)
  headMaxY: number;   // Bounding box bottom limit (percentage from crop top, 0-100)
  chinY: number;      // Bounding box chin guide line (percentage from crop top, 0-100)
}

export interface PhotoTemplate {
  id: string;
  name: string;
  widthMm: number;
  heightMm: number;
  aspect: number;
  guides?: TemplateGuide; // undefined for free crop
  bgRequirement: string;  // Information message displayed in the workspace
}

export const PHOTO_TEMPLATES: PhotoTemplate[] = [
  {
    id: "us_visa",
    name: "2×2 in (US Visa)",
    widthMm: 50.8,
    heightMm: 50.8,
    aspect: 1,
    bgRequirement: "Plain white or off-white background required.",
    guides: {
      eyeLineY: 42,
      headMinY: 15,
      headMaxY: 22,
      chinY: 75,
    },
  },
  {
    id: "in_passport",
    name: "3.5×4.0 cm (India Passport)",
    widthMm: 35,
    heightMm: 40,
    aspect: 35 / 40,
    bgRequirement: "Plain white background required.",
    guides: {
      eyeLineY: 38,
      headMinY: 12,
      headMaxY: 20,
      chinY: 82,
    },
  },
  {
    id: "ca_passport",
    name: "5×7 cm (Canada Passport)",
    widthMm: 50,
    heightMm: 70,
    aspect: 50 / 70,
    bgRequirement: "Plain white or light-coloured background required.",
    guides: {
      eyeLineY: 44,
      headMinY: 22,
      headMaxY: 28,
      chinY: 72,
    },
  },
  {
    id: "schengen_visa",
    name: "3.5×4.5 cm (Schengen Visa)",
    widthMm: 35,
    heightMm: 45,
    aspect: 35 / 45,
    bgRequirement: "Light-coloured (ideally light grey) background required.",
    guides: {
      eyeLineY: 38,
      headMinY: 12,
      headMaxY: 20,
      chinY: 82,
    },
  },
  {
    id: "free",
    name: "Free Crop",
    widthMm: 35,
    heightMm: 45, // default layout aspect ratio
    aspect: 35 / 45,
    bgRequirement: "Custom proportions. Check local regulatory guidelines.",
  },
];

export function getTemplateById(id: string | undefined): PhotoTemplate {
  if (!id) return PHOTO_TEMPLATES[PHOTO_TEMPLATES.length - 1]; // fallback to Free
  return PHOTO_TEMPLATES.find((t) => t.id === id) || PHOTO_TEMPLATES[PHOTO_TEMPLATES.length - 1];
}

export function getTemplateByAspect(aspect: number | undefined): PhotoTemplate {
  if (aspect === undefined) return PHOTO_TEMPLATES[PHOTO_TEMPLATES.length - 1]; // Free
  // Match aspect ratios within 2 decimals
  const target = PHOTO_TEMPLATES.find(
    (t) => t.id !== "free" && Math.abs(t.aspect - aspect) < 0.01
  );
  return target || PHOTO_TEMPLATES[PHOTO_TEMPLATES.length - 1];
}
