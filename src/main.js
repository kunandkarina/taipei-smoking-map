import { createMap, createClusterGroup, createMarkerEntries, addUserLocationMarker } from './map.js';
import { locateUser, LOCATION_ERROR_MESSAGES } from './geolocation.js';
import { initDetailView, openDetailView } from './ui/detailView.js';
import { subscribeToFilters, applyFilters } from './filters.js';
import { initFilterBar } from './ui/filterBar.js';

const DATA_URL = 'public/data/smoking-areas.json';
const USER_LOCATION_ZOOM = 15;

function isValidCoordinate(area) {
  return (
    typeof area.lat === 'number' &&
    typeof area.lng === 'number' &&
    Number.isFinite(area.lat) &&
    Number.isFinite(area.lng)
  );
}

function partitionAreas(areas) {
  const valid = [];
  const skipped = [];

  for (const area of areas) {
    if (isValidCoordinate(area)) {
      valid.push(area);
    } else {
      skipped.push({ id: area.id, name: area.name, reason: `invalid lat/lng (${area.lat}, ${area.lng})` });
    }
  }

  return { valid, skipped };
}

async function loadAreas() {
  const response = await fetch(DATA_URL);
  if (!response.ok) {
    throw new Error(`Failed to load ${DATA_URL}: ${response.status} ${response.statusText}`);
  }
  const { areas } = await response.json();
  return areas;
}

function showLocationBanner(message) {
  const banner = document.getElementById('location-banner');
  document.getElementById('location-banner-message').textContent = message;
  banner.hidden = false;
}

function hideLocationBanner() {
  document.getElementById('location-banner').hidden = true;
}

// The floating top bar's height changes (banner shown/hidden, filter bar
// wrapping to a second row on narrow screens), so Leaflet's zoom control —
// which defaults to a fixed top-left position — needs a live offset rather
// than a fixed margin, or it ends up hidden underneath the bar.
function observeTopStackHeight() {
  const topStack = document.getElementById('top-stack');
  const updateOffset = () => {
    document.documentElement.style.setProperty('--map-controls-offset', `${topStack.offsetHeight + 8}px`);
  };
  updateOffset();
  new ResizeObserver(updateOffset).observe(topStack);
}

// Geolocation is requested independently of map/marker rendering: the
// fallback city-wide view is already on screen by the time this runs, and
// this never blocks or is awaited by the rest of main().
function initGeolocation(map) {
  let userMarker = null;

  function attempt() {
    locateUser({
      onSuccess: ({ lat, lng }) => {
        hideLocationBanner();
        if (userMarker) {
          map.removeLayer(userMarker);
        }
        userMarker = addUserLocationMarker(map, lat, lng);
        map.flyTo([lat, lng], USER_LOCATION_ZOOM);
      },
      onError: ({ type }) => {
        showLocationBanner(LOCATION_ERROR_MESSAGES[type]);
      },
    });
  }

  document.getElementById('location-banner-button').addEventListener('click', attempt);

  attempt();
}

// Re-derives which markers should be visible from the full entry list on
// every filter change, then resets the cluster group to exactly that set.
// Simple and always correct for 274 markers, vs. diffing add/remove calls.
function applyMarkerFilter(clusterGroup, markerEntries, filterState) {
  const visibleIds = new Set(applyFilters(markerEntries.map((entry) => entry.data), filterState).map((area) => area.id));

  clusterGroup.clearLayers();
  for (const entry of markerEntries) {
    if (visibleIds.has(entry.data.id)) {
      clusterGroup.addLayer(entry.marker);
    }
  }
}

async function main() {
  // Fallback city-wide view renders immediately; nothing below awaits
  // the geolocation permission prompt.
  const map = createMap();
  initGeolocation(map);
  initDetailView();
  observeTopStackHeight();

  const clusterGroup = createClusterGroup();
  const areas = await loadAreas();
  const { valid, skipped } = partitionAreas(areas);

  // Kept as a plain array (not just inside clusterGroup) so district/type
  // filters — and later, the list view — can look up markers by area
  // id/district/type and share the same filter state via filters.js.
  const markerEntries = createMarkerEntries(valid, clusterGroup, openDetailView);
  clusterGroup.addTo(map);

  initFilterBar(valid);
  subscribeToFilters((filterState) => {
    applyMarkerFilter(clusterGroup, markerEntries, filterState);
  });

  console.log(`Markers rendered: ${markerEntries.length} / ${areas.length}`);
  if (skipped.length > 0) {
    console.warn('Skipped records:', skipped);
  }
}

main().catch((error) => {
  console.error(error);
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./service-worker.js').catch((error) => {
      console.error('Service worker registration failed:', error);
    });
  });
}
