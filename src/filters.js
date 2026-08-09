export const TYPE_META = {
  戶外開放式吸菸區: { slug: 'outdoor-open', shortLabel: '戶外開放' },
  戶外負壓式吸菸區: { slug: 'outdoor-negative', shortLabel: '戶外負壓' },
  室內吸菸室: { slug: 'indoor', shortLabel: '室內' },
};

export const TYPE_OPTIONS = Object.keys(TYPE_META);

const state = {
  districts: new Set(),
  types: new Set(),
};

const listeners = new Set();

export function getFilterState() {
  return { districts: new Set(state.districts), types: new Set(state.types) };
}

// Empty set for a category means "show all" in that category — the two
// categories combine with AND, options within a category combine with OR.
export function setDistricts(districts) {
  state.districts = new Set(districts);
  notify();
}

export function setTypes(types) {
  state.types = new Set(types);
  notify();
}

export function subscribeToFilters(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function notify() {
  const snapshot = getFilterState();
  for (const listener of listeners) {
    listener(snapshot);
  }
}

export function applyFilters(areas, filterState = getFilterState()) {
  const { districts, types } = filterState;
  return areas.filter((area) => {
    const districtMatch = districts.size === 0 || districts.has(area.district);
    const typeMatch = types.size === 0 || types.has(area.type);
    return districtMatch && typeMatch;
  });
}

// Preserves first-seen order from the source data rather than sorting,
// since that already follows the government dataset's district ordering.
export function getDistinctDistricts(areas) {
  const seen = new Set();
  const districts = [];
  for (const area of areas) {
    if (!seen.has(area.district)) {
      seen.add(area.district);
      districts.push(area.district);
    }
  }
  return districts;
}
