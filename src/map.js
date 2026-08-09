// Taipei City Hall — sensible default center with a citywide view.
const DEFAULT_CENTER = [25.0375, 121.5645];
const DEFAULT_ZOOM = 13;

export function createMap() {
  const map = L.map('map').setView(DEFAULT_CENTER, DEFAULT_ZOOM);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  }).addTo(map);

  return map;
}

export function createClusterGroup(options) {
  return L.markerClusterGroup(options);
}

// Builds one marker per area and adds it to the cluster group, while
// returning a plain {marker, data} array (not just the cluster group) so
// individual markers can be looked up and added/removed later — e.g. for
// district/type filters that need to toggle specific markers. Tapping a
// marker directly invokes onMarkerClick (opens the detail view), matching
// Google Maps pin-tap behavior rather than an intermediate popup.
export function createMarkerEntries(areas, clusterGroup, onMarkerClick) {
  return areas.map((area) => {
    const marker = L.marker([area.lat, area.lng]);
    marker.on('click', () => onMarkerClick(area));
    clusterGroup.addLayer(marker);
    return { marker, data: area };
  });
}

const USER_LOCATION_ICON = L.divIcon({
  className: 'user-location-marker',
  html: '<div class="user-location-dot"></div>',
  iconSize: [16, 16],
  iconAnchor: [8, 8],
});

// Added directly to the map (never to the cluster group) so it stays
// visually distinct from site markers and is never swallowed into a cluster.
export function addUserLocationMarker(map, lat, lng) {
  return L.marker([lat, lng], {
    icon: USER_LOCATION_ICON,
    zIndexOffset: 1000,
    keyboard: false,
  }).addTo(map);
}
