import { TYPE_META, TYPE_OPTIONS, getDistinctDistricts, setDistricts, setTypes } from '../filters.js';

const selectedDistricts = new Set();
const selectedTypes = new Set();

function countByDistrict(areas) {
  const counts = new Map();
  for (const area of areas) {
    counts.set(area.district, (counts.get(area.district) || 0) + 1);
  }
  return counts;
}

function getElements() {
  return {
    districtToggle: document.getElementById('district-toggle'),
    districtPanel: document.getElementById('district-panel'),
    districtOptions: document.getElementById('district-options'),
    districtClear: document.getElementById('district-clear'),
    districtCount: document.getElementById('district-count'),
    typeToggles: document.getElementById('type-toggles'),
  };
}

export function initFilterBar(areas) {
  const els = getElements();
  renderDistrictOptions(els, getDistinctDistricts(areas), countByDistrict(areas));
  renderTypeToggles(els);
  wireDropdown(els);
}

function renderDistrictOptions(els, districts, counts) {
  els.districtOptions.replaceChildren();

  for (const district of districts) {
    const label = document.createElement('label');
    label.className = 'filter-dropdown__option';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.value = district;
    checkbox.addEventListener('change', () => {
      if (checkbox.checked) {
        selectedDistricts.add(district);
      } else {
        selectedDistricts.delete(district);
      }
      updateDistrictCount(els);
      setDistricts(selectedDistricts);
    });

    const name = document.createElement('span');
    name.textContent = district;

    const count = document.createElement('span');
    count.className = 'filter-dropdown__option-count';
    count.textContent = String(counts.get(district) || 0);

    label.append(checkbox, name, count);
    els.districtOptions.appendChild(label);
  }

  els.districtClear.addEventListener('click', () => {
    selectedDistricts.clear();
    for (const checkbox of els.districtOptions.querySelectorAll('input[type="checkbox"]')) {
      checkbox.checked = false;
    }
    updateDistrictCount(els);
    setDistricts(selectedDistricts);
  });
}

function updateDistrictCount(els) {
  els.districtCount.textContent = String(selectedDistricts.size);
  els.districtCount.hidden = selectedDistricts.size === 0;
}

function renderTypeToggles(els) {
  els.typeToggles.replaceChildren();

  for (const type of TYPE_OPTIONS) {
    const meta = TYPE_META[type];
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'type-toggle';
    button.dataset.type = meta.slug;
    button.setAttribute('aria-pressed', 'false');
    button.textContent = meta.shortLabel;

    button.addEventListener('click', () => {
      const isActive = button.classList.toggle('is-active');
      button.setAttribute('aria-pressed', String(isActive));
      if (isActive) {
        selectedTypes.add(type);
      } else {
        selectedTypes.delete(type);
      }
      setTypes(selectedTypes);
    });

    els.typeToggles.appendChild(button);
  }
}

function wireDropdown(els) {
  els.districtToggle.addEventListener('click', () => {
    setPanelOpen(els, els.districtPanel.hidden);
  });

  document.addEventListener('click', (event) => {
    if (els.districtPanel.hidden) {
      return;
    }
    if (els.districtToggle.contains(event.target) || els.districtPanel.contains(event.target)) {
      return;
    }
    setPanelOpen(els, false);
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !els.districtPanel.hidden) {
      setPanelOpen(els, false);
    }
  });
}

function setPanelOpen(els, open) {
  els.districtPanel.hidden = !open;
  els.districtToggle.setAttribute('aria-expanded', String(open));
}
