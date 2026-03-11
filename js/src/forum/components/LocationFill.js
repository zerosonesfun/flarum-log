/**
 * When the composer body contains `Location`, request geolocation (once per composer),
 * reverse-geocode via Nominatim, and insert the result after `Location`.
 * Uses a cache so subsequent composers with `Location` don't re-request permission.
 */

const LOCATION_MARKER = '`Location`';
const LOCATION_ATTR = 'data-drink-log-location-handled';

let cachedLocation = null;

async function getLocationString() {
  if (!navigator.geolocation) {
    return 'Unknown';
  }

  const position = await new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject);
  });

  const lat = position.coords.latitude;
  const lon = position.coords.longitude;

  const res = await fetch(
    `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json&zoom=10`,
    {
      headers: {
        Accept: 'application/json',
        'Accept-Language': 'en',
        'User-Agent': 'FlarumDrinkLog/1.0 (Flarum extension; geolocation for composer)',
      },
    }
  );

  if (!res.ok) return 'Unknown';
  const data = await res.json();
  const addr = data.address || {};

  const city =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.hamlet ||
    '';

  const state = addr.state || addr.state_code || '';
  const country = addr.country_code
    ? addr.country_code.toUpperCase()
    : (addr.country || '');

  let location = city;
  if (state) location += `, ${state}`;
  else if (country) location += `, ${country}`;

  return location || 'Unknown';
}

function insertLocationAfterMarker(textarea, location, onChange) {
  const value = textarea.value;
  if (!value.includes(LOCATION_MARKER)) return;

  // Replace first `Location` (and any following space) with `Location` <result>
  const newValue = value.replace(
    new RegExp(LOCATION_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\s*'),
    LOCATION_MARKER + ' ' + location
  );
  if (newValue === value) return;

  textarea.value = newValue;
  if (onChange) onChange(newValue);
  textarea.dispatchEvent(new Event('input', { bubbles: true }));
}

function scheduleCheck(textarea, onChange) {
  requestAnimationFrame(() => tryPopulateLocation(textarea, onChange));
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
