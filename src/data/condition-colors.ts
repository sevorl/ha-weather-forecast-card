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
