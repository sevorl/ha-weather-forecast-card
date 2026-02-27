import { ConditionColorMap } from "../types";

/**
 * Default condition colors based on hourly-weather card.
 * These represent the color of the sky/weather condition.
 */
export const DEFAULT_CONDITION_COLORS: ConditionColorMap = {
  "clear-night": "#000",
  cloudy: "#777",
  fog: "#777", // same as cloudy
  hail: "#2b5174",
  lightning: "#44739d", // same as rainy
  "lightning-rainy": "#44739d", // same as rainy
  partlycloudy: "#b3dbff",
  pouring: "#44739d", // same as rainy
  rainy: "#44739d",
  snowy: "#fff",
  "snowy-rainy": "#b3dbff", // same as partlycloudy
  sunny: "#90cbff",
  windy: "#90cbff", // same as sunny
  "windy-variant": "#90cbff", // same as sunny
  exceptional: "#ff9d00",
};

/**
 * Gets the color for a weather condition, falling back to defaults
 * and similar conditions as needed.
 */
export function getConditionColor(
  condition: string,
  customColors?: ConditionColorMap
): { foreground?: string; background?: string } {
  const normalizedCondition = condition.toLowerCase().replace(/_/g, "-");

  // Check custom colors first
  if (customColors?.[normalizedCondition]) {
    const color = customColors[normalizedCondition];
    if (typeof color === "string") {
      return { background: color };
    }
    return color;
  }

  // Fall back to default
  const defaultColor = DEFAULT_CONDITION_COLORS[normalizedCondition];
  if (defaultColor) {
    return { background: typeof defaultColor === "string" ? defaultColor : defaultColor.background };
  }

  // No color found
  return {};
}

const NIGHT_FALLBACK_CONDITIONS = new Set([
  "sunny",
  "clear",
  "windy",
  "windy-variant",
  "partlycloudy",
  "exceptional",
]);

const NIGHT_SAFE_CONDITIONS = new Set([
  "clear-night",
  "cloudy",
  "fog",
  "hail",
  "lightning",
  "lightning-rainy",
  "pouring",
  "rainy",
  "snowy",
  "snowy-rainy",
]);

const mapConditionForNight = (condition: string, isNightTime: boolean): string => {
  if (!isNightTime) return condition;

  const normalized = condition.toLowerCase().replace(/_/g, "-");

  if (NIGHT_SAFE_CONDITIONS.has(normalized)) {
    return normalized;
  }

  if (NIGHT_FALLBACK_CONDITIONS.has(normalized)) {
    return "clear-night";
  }

  return normalized;
};

export function getConditionColorNightAware(
  condition: string,
  isNightTime: boolean,
  customColors?: ConditionColorMap
): { foreground?: string; background?: string } {
  const conditionForColor = mapConditionForNight(condition, isNightTime);
  return getConditionColor(conditionForColor, customColors);
}

/**
 * Returns either "#ffffff" or "#000000" for maximum contrast against a hex background color.
 * Uses WCAG relative luminance calculation.
 */
export function getContrastColor(hexColor: string): string {
  let hex = hexColor.replace("#", "");
  if (hex.length === 3) {
    hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
  }
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;
  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  const luminance =
    0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
  return luminance < 0.5 ? "#ffffff" : "#000000";
}
