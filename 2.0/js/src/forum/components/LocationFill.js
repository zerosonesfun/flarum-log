/**
 * When the composer body contains `Date`, `Time`, or `Location`, fill them once per composer:
 * - `Date` → today's date (device local) MM/DD/YYYY
 * - `Time` → current time (device local) HH:MM AM/PM TIMEZONE
 * - `Location` → geolocation + reverse geocode (once per composer; cached after first success).
 */

const DATE_MARKER = '`Date`';
const TIME_MARKER = '`Time`';
const LOCATION_MARKER = '`Location`';
const DATE_ATTR = 'data-drink-log-date-filled';
const TIME_ATTR = 'data-drink-log-time-filled';
const LOCATION_ATTR = 'data-drink-log-location-handled';

let cachedLocation = null;

function getDateString() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${mm}/${dd}/${yyyy}`;
}

function getTimeString() {
  return new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZoneName: 'short',
  });
}

const NOMINATIM_HEADERS = {
  Accept: 'application/json',
  'Accept-Language': 'en',
  'User-Agent': 'FlarumDrinkLog/1.0 (Flarum extension; geolocation for composer)',
};

function parseAddressFromResponse(data) {
  const addr = (data && data.address) || {};
  const cityLevel =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    addr.suburb ||
    addr.neighbourhood ||
    '';
  const locality = cityLevel || addr.county || '';
  const state = addr.state || addr.state_code || '';
  const country = addr.country_code
    ? addr.country_code.toUpperCase()
    : (addr.country || '');
  return { locality, cityLevelLocality: cityLevel, state, country };
}

function buildLocationString(parsed) {
  const { locality, state, country } = parsed;
  let location = locality;
  if (state) location += location ? `, ${state}` : state;
  else if (country) location += location ? `, ${country}` : country;
  return location || 'Unknown';
}

async function fetchReverse(lat, lon, zoom) {
  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=${zoom}&addressdetails=1`,
    { headers: NOMINATIM_HEADERS }
  );
  if (!res.ok) return null;
  const data = await res.json();
  return parseAddressFromResponse(data);
}

async function getLocationString() {
  if (!navigator.geolocation) {
    return 'Unknown';
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  let result = await fetchReverse(lat, lon, 10);
  if (!result) return 'Unknown';

  if (result.cityLevelLocality) {
    return buildLocationString(result);
  }

  let fallback = buildLocationString(result);
  for (const zoom of [12, 14, 18]) {
    result = await fetchReverse(lat, lon, zoom);
    if (!result) continue;
    if (result.cityLevelLocality) {
      return buildLocationString(result);
    }
    fallback = buildLocationString(result);
  }
  return fallback || 'Unknown';
}

function replaceMarkerInValue(value, marker, replacement) {
  const escaped = marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return value.replace(new RegExp(escaped + '[ \\t]*'), marker + ' ' + replacement);
}

function insertLocationAfterMarker(textarea, location, onChange) {
  const value = textarea.value;
  if (!value.includes(LOCATION_MARKER)) return;
  const newValue = replaceMarkerInValue(value, LOCATION_MARKER, location);
  if (newValue === value) return;
  textarea.value = newValue;
  if (onChange) onChange(newValue);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function tryPopulateDateAndTime(textarea, onChange) {
  if (!textarea) return;
  let value = textarea.value;
  let updated = false;
  if (value.includes(DATE_MARKER) && !textarea.getAttribute(DATE_ATTR)) {
    textarea.setAttribute(DATE_ATTR, '1');
    value = replaceMarkerInValue(value, DATE_MARKER, getDateString());
    updated = true;
  }
  if (value.includes(TIME_MARKER) && !textarea.getAttribute(TIME_ATTR)) {
    textarea.setAttribute(TIME_ATTR, '1');
    value = replaceMarkerInValue(value, TIME_MARKER, getTimeString());
    updated = true;
  }
  if (updated) {
    textarea.value = value;
    if (onChange) onChange(value);
    textarea.dispatchEvent(new Event('input', { bubbles: true }));
  }
}

function scheduleCheck(textarea, onChange) {
  requestAnimationFrame(() => {
    tryPopulateDateAndTime(textarea, onChange);
    tryPopulateLocation(textarea, onChange);
  });
}

function tryPopulateLocation(textarea, onChange) {
  if (!textarea || textarea.getAttribute(LOCATION_ATTR)) return;
  if (!textarea.value.includes(LOCATION_MARKER)) return;

  textarea.setAttribute(LOCATION_ATTR, '1');

  if (cachedLocation) {
    insertLocationAfterMarker(textarea, cachedLocation, onChange);
    return;
  }

  getLocationString()
    .then((location) => {
      cachedLocation = location;
      insertLocationAfterMarker(textarea, location, onChange);
    })
    .catch(() => {
      // User denied or error: don't insert, don't ask again in this composer
    });
}

/**
 * Attach location-fill behavior to a composer textarea.
 * When content contains `Location`, asks for geolocation once per composer and inserts result.
 * options.onChange(newText) is called when we insert (to sync composer state).
 */
export function attachLocationFill(textarea, options) {
  if (!textarea || textarea.tagName !== 'TEXTAREA') return () => {};

  const boundOnChange =
    options && typeof options.onChange === 'function'
      ? options.onChange
      : (newText) => {
          textarea.dispatchEvent(new Event('input', { bubbles: true }));
        };

  scheduleCheck(textarea, boundOnChange);

  const onInput = () => scheduleCheck(textarea, boundOnChange);
  textarea.addEventListener('input', onInput);

  return function detach() {
    textarea.removeEventListener('input', onInput);
  };
}
