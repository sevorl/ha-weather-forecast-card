import { HomeAssistant, TimeFormat } from "custom-card-helpers";
import { STATE_NOT_RUNNING } from "home-assistant-js-websocket";
import * as SunCalc from "suncalc";
import memoizeOne from "memoize-one";
import { ConditionSpan, SuntimesInfo } from "./types";
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

  console.log('[GroupByCondition] Starting with forecast length:', forecast.length);

  const conditionSpans: ConditionSpan[] = [];
  let currentCondition = forecast[0]?.condition || "";
  let startIndex = 0;
  let currentIsNight = hass ? getSuntimesInfo(hass, forecast[0].datetime)?.isNightTime : false;
  let currentNightAwareCondition = mapConditionForNight(currentCondition, currentIsNight);

  console.log(`[GroupByCondition] Initial: datetime=${forecast[0].datetime}, condition=${currentCondition}, isNight=${currentIsNight}, nightAware=${currentNightAwareCondition}`);

  for (let i = 1; i < forecast.length; i++) {
    const condition = forecast[i]?.condition || "";
    const isNight = hass ? getSuntimesInfo(hass, forecast[i].datetime)?.isNightTime : false;
    const nightAwareCondition = mapConditionForNight(condition, isNight);

    console.log(`[GroupByCondition] i=${i}, datetime=${forecast[i].datetime}, condition=${condition}, isNight=${isNight}, nightAware=${nightAwareCondition}`);

    // Break grouping if NIGHT-AWARE condition changes (visual appearance changes)
    const conditionChanged = nightAwareCondition !== currentNightAwareCondition;

    if (conditionChanged) {
      console.log(`[GroupByCondition] Split! nightAware changed: ${currentNightAwareCondition} → ${nightAwareCondition}`);
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
