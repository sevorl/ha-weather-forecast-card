import { HomeAssistant, TimeFormat } from "custom-card-helpers";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import * as SunCalc from "suncalc";
import memoizeOne from "memoize-one";
import {
  ConditionSpan,
  CurrentWeatherAttributeConfig,
  SuntimesInfo,
  WeatherForecastCardConfig,
} from "./types";
import { ForecastAttribute } from "./data/weather";

// Map condition to night-aware version for grouping
const mapConditionForNight = (condition: string, isNightTime: boolean): string => {
  if (!isNightTime) return condition;
  const normalized = condition.toLowerCase().replace(/_/g, "-");
  
  const NIGHT_SAFE_CONDITIONS = new Set([
    "clear-night", "cloudy", "fog", "hail", "lightning", "lightning-rainy",
    "pouring", "rainy", "snowy", "snowy-rainy"
  ]);
  
  const NIGHT_FALLBACK_CONDITIONS = new Set([
    "sunny", "clear", "windy", "windy-variant", "partlycloudy", "exceptional"
  ]);
  
  if (NIGHT_SAFE_CONDITIONS.has(normalized)) return normalized;
  if (NIGHT_FALLBACK_CONDITIONS.has(normalized)) return "clear-night";
  return normalized;
};

export interface HourParts {
  hour: string;
  suffix?: string;
}

export interface TimeParts {
  time: string;
  suffix?: string;
}

export const createWarningText = (
  hass: HomeAssistant | undefined,
  entity: string
): string => {
  if (!hass) {
    return "Home Assistant instance is not available.";
  }

  return hass.config.state !== STATE_NOT_RUNNING
    ? `${hass.localize("ui.card.common.entity_not_found")}: ${entity}`
    : hass.localize("ui.panel.lovelace.warning.starting");
};

export const formatDay = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): string => {
  return toDate(datetime).toLocaleDateString(getLocale(hass), {
    weekday: "short",
  });
};

export const formatDayOfMonth = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): string => {
  return toDate(datetime).toLocaleDateString(getLocale(hass), {
    day: "numeric",
  });
};

export const formatHourParts = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): HourParts => {
  const date = toDate(datetime);
  const locale = getLocale(hass);
  const isAmPm = useAmPm(hass);

  // Try to extract parts using Intl.DateTimeFormat for proper locale handling
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      hour12: isAmPm,
    });
    const parts = formatter.formatToParts(date);

    const hourPart = parts.find((p) => p.type === "hour");
    const dayPeriodPart = parts.find((p) => p.type === "dayPeriod");

    if (hourPart) {
      if (dayPeriodPart) {
        return {
          hour: hourPart.value,
          suffix: dayPeriodPart.value,
        };
      }

      const hourIndex = parts.indexOf(hourPart);
      const suffixLiteral = parts
        .slice(hourIndex + 1)
        .filter((p) => p.type === "literal")
        .map((p) => p.value)
        .join("");

      if (suffixLiteral && suffixLiteral.trim()) {
        return {
          hour: hourPart.value,
          suffix: suffixLiteral.trim(),
        };
      }

      return { hour: hourPart.value };
    }
  } catch {
    // Fallback below
  }

  // Fallback: extract numeric portion from formatted string
  const fullTime = date.toLocaleTimeString(locale, {
    hour: "numeric",
    hour12: isAmPm,
  });
  const numericMatch = fullTime.match(/\d+/);
  const hour = numericMatch ? numericMatch[0] : fullTime;
  const suffix = fullTime.replace(/\d+\s*/, "").trim();

  return suffix ? { hour, suffix } : { hour };
};

export const formatTimeParts = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): TimeParts => {
  const date = toDate(datetime);
  const locale = getLocale(hass);
  const isAmPm = useAmPm(hass);

  // Try to extract parts using Intl.DateTimeFormat for proper locale handling
  try {
    const formatter = new Intl.DateTimeFormat(locale, {
      hour: "numeric",
      minute: "2-digit",
      hour12: isAmPm,
    });
    const parts = formatter.formatToParts(date);

    const hourPart = parts.find((p) => p.type === "hour");
    const minutePart = parts.find((p) => p.type === "minute");
    const dayPeriodPart = parts.find((p) => p.type === "dayPeriod");

    if (hourPart && minutePart) {
      const hourIndex = parts.indexOf(hourPart);
      const minuteIndex = parts.indexOf(minutePart);
      const separator = parts
        .slice(hourIndex + 1, minuteIndex)
        .map((p) => p.value)
        .join("");

      const time = `${hourPart.value}${separator}${minutePart.value}`;

      if (dayPeriodPart) {
        return {
          time,
          suffix: dayPeriodPart.value,
        };
      }

      const suffixLiteral = parts
        .slice(minuteIndex + 1)
        .filter((p) => p.type === "literal")
        .map((p) => p.value)
        .join("");

      if (suffixLiteral && suffixLiteral.trim()) {
        return {
          time,
          suffix: suffixLiteral.trim(),
        };
      }

      return { time };
    }
  } catch {
    // Fallback below
  }

  // Fallback: extract time portion from formatted string
  const fullTime = date.toLocaleTimeString(locale, {
    hour: "numeric",
    minute: "2-digit",
    hour12: isAmPm,
  });
  const timeMatch = fullTime.match(/\d+[:.]\d+/);
  const time = timeMatch ? timeMatch[0] : fullTime;
  const suffix = fullTime.replace(/\d+[:.]\d+\s*/, "").trim();

  return suffix ? { time, suffix } : { time };
};

export const normalizeDate = (dateString: string) => {
  const date = new Date(dateString);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
};

export const useAmPm = memoizeOne(
  (hass: HomeAssistant | undefined): boolean => {
    const locale = hass?.locale;
    if (
      locale?.time_format === TimeFormat.language ||
      locale?.time_format === TimeFormat.system
    ) {
      const testLanguage =
        locale.time_format === TimeFormat.language
          ? locale.language
          : undefined;
      const test = new Date("January 1, 2023 22:00:00").toLocaleString(
        testLanguage
      );
      return test.includes("10");
    }

    return locale?.time_format === TimeFormat.am_pm;
  }
);

export const getLocale = (hass: HomeAssistant | undefined): string => {
  return hass?.locale?.language || navigator.language || "en";
};

export const toDate = (datetime: string | Date): Date => {
  return typeof datetime === "string" ? new Date(datetime) : datetime;
};

export const getSuntimesInfo = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): SuntimesInfo | null => {
  const { latitude, longitude } = hass?.config || {};
  if (!latitude || !longitude) {
    return null;
  }

  const date = toDate(datetime);
  const times = SunCalc.getTimes(date, latitude, longitude);

  return {
    sunrise: times.sunrise,
    sunset: times.sunset,
    isNightTime: date < times.sunrise || date > times.sunset,
  };
};

export interface MoonPhaseInfo {
  /** Illuminated fraction of the disc, 0 (new moon) to 1 (full moon). */
  fraction: number;
  /** Whether the lit limb is on the right (waxing in the northern hemisphere). */
  litRight: boolean;
}

export const getMoonPhaseInfo = (
  hass: HomeAssistant | undefined,
  datetime: string | Date
): MoonPhaseInfo => {
  const date = toDate(datetime);
  const { fraction, phase } = SunCalc.getMoonIllumination(date);
  // phase runs 0 (new) -> 0.5 (full) -> 1 (new); rising toward full is waxing.
  const waxing = phase <= 0.5;
  const southernHemisphere = (hass?.config?.latitude ?? 0) < 0;
  return { fraction, litRight: waxing !== southernHemisphere };
};

/**
 * SVG path (viewBox `0 0 100 100`) for the moon's unlit region. The terminator
 * is a half-ellipse whose radius collapses to 0 at the quarters and grows to
 * full at new/full moon; the unlit side is boxed out past the disc so the limb
 * stays solid once the shadow is blurred and clipped.
 */
export const moonShadowPath = (fraction: number, litRight: boolean): string => {
  const f = Math.min(1, Math.max(0, fraction));
  const rx = (50 * Math.abs(1 - 2 * f)).toFixed(2);
  const crescent = f < 0.5;
  const termSweep = litRight === crescent ? 0 : 1;
  const boxX = litRight ? -60 : 160;
  return `M50 0 L${boxX} 0 L${boxX} 100 L50 100 A${rx} 50 0 0 ${termSweep} 50 0 Z`;
};

/**
 * SVG path for the moon's lit region (the complement of moonShadowPath).
 * Blurred behind the disc, it makes only the sunlit limb glow.
 */
export const moonLitPath = (fraction: number, litRight: boolean): string => {
  const f = Math.min(1, Math.max(0, fraction));
  const rx = (50 * Math.abs(1 - 2 * f)).toFixed(2);
  const outerSweep = litRight ? 1 : 0;
  const crescent = f < 0.5;
  const termSweep = litRight === crescent ? 0 : 1;
  return `M50 0 A50 50 0 0 ${outerSweep} 50 100 A${rx} 50 0 0 ${termSweep} 50 0 Z`;
};

export const average = (data: number[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((a, b) => a + b, 0) / data.length;
};

export const endOfHour = (input: Date | string): Date => {
  const d = typeof input === "string" ? new Date(input) : new Date(input);

  d.setMinutes(59, 59, 999);

  return d;
};

/**
 * Groups consecutive forecast items with the same weather condition.
 * Similar to the lovelace-hourly-weather card's condition grouping.
 *
 * @param forecast - Array of forecast items to group
 * @returns Array of condition spans with start/end indices and counts
 */
/**
 * Returns the localized display name for a weather condition code.
 * Falls back to the raw condition string if no localization is found.
 */
export const getLocalizedCondition = (
  hass: HomeAssistant,
  condition: string
): string => {
  const normalized = condition.toLowerCase().replace(/_/g, "-");
  return (
    hass.localize(
      `component.weather.entity_component._.state.${normalized}`
    ) || condition
  );
};

export const groupForecastByCondition = (
  forecast: ForecastAttribute[],
  hass?: HomeAssistant
): ConditionSpan[] => {
  if (!forecast || forecast.length === 0) {
    return [];
  }

  const conditionSpans: ConditionSpan[] = [];
  let currentCondition = forecast[0]?.condition || "";
  let startIndex = 0;
  let currentIsNight = hass ? getSuntimesInfo(hass, forecast[0].datetime)?.isNightTime : false;
  let currentNightAwareCondition = mapConditionForNight(currentCondition, currentIsNight);

  for (let i = 1; i < forecast.length; i++) {
    const condition = forecast[i]?.condition || "";
    const isNight = hass ? getSuntimesInfo(hass, forecast[i].datetime)?.isNightTime : false;
    const nightAwareCondition = mapConditionForNight(condition, isNight);

    // Break grouping if NIGHT-AWARE condition changes (visual appearance changes)
    const conditionChanged = nightAwareCondition !== currentNightAwareCondition;

    if (conditionChanged) {
      // End of current span, create entry
      conditionSpans.push({
        condition: currentCondition,
        startIndex,
        endIndex: i - 1,
        count: i - startIndex,
      });

      // Start new span
      currentCondition = condition;
      currentIsNight = isNight;
      currentNightAwareCondition = nightAwareCondition;
      startIndex = i;
    }
  }

  // Add the final span
  conditionSpans.push({
    condition: currentCondition,
    startIndex,
    endIndex: forecast.length - 1,
    count: forecast.length - startIndex,
  });

  return conditionSpans;
};

const entityOf = (item: unknown): string | undefined => {
  const entity =
    item != null && typeof item === "object"
      ? (item as CurrentWeatherAttributeConfig).entity
      : undefined;

  return typeof entity === "string" ? entity : undefined;
};

/**
 * Collects the entity ids the current-weather section reads from `hass.states`
 * beyond the primary weather entity: the temperature sensor, the secondary info
 * entity and any custom entities used in `show_attributes`. Used to keep the
 * card reactive to those sensors (see `shouldUpdate`); the primary `entity` is
 * intentionally excluded because `hasConfigOrEntityChanged` already tracks it.
 */
export const getReferencedCurrentEntities = (
  config: WeatherForecastCardConfig
): string[] => {
  const current = config.current;
  if (!current) {
    return [];
  }

  const ids = new Set<string>();

  if (current.temperature_entity) {
    ids.add(current.temperature_entity);
  }

  const secondaryEntity = entityOf(current.secondary_info_attribute);
  if (secondaryEntity) {
    ids.add(secondaryEntity);
  }

  const showAttr = current.show_attributes;
  if (Array.isArray(showAttr)) {
    for (const item of showAttr) {
      const entity = entityOf(item);
      if (entity) {
        ids.add(entity);
      }
    }
  } else {
    const entity = entityOf(showAttr);
    if (entity) {
      ids.add(entity);
    }
  }

  // The primary entity is tracked separately by hasConfigOrEntityChanged; drop it
  // if a current-section entity happens to point at the same id.
  ids.delete(config.entity);

  return [...ids];
};
