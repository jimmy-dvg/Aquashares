import { BULGARIAN_LOCATION_SUGGESTIONS, mergeLocationSuggestions, sanitizeLocation } from '../utils/locations-bg.js';

const locationMapState = {
  map: null,
  marker: null,
  modalApi: null,
  selectedLat: null,
  selectedLng: null
};

function updateLocationCoordinatesPreview(elements) {
  if (!(elements.locationCoords instanceof HTMLElement)) {
    return;
  }

  const lat = Number(elements.locationLat?.value || '');
  const lng = Number(elements.locationLng?.value || '');

  if (Number.isFinite(lat) && Number.isFinite(lng)) {
    elements.locationCoords.textContent = `Координати: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    return;
  }

  elements.locationCoords.textContent = 'Координати: не са избрани';
}

export function updateLocationCoordinateInputs(elements, lat, lng) {
  if (elements.locationLat instanceof HTMLInputElement) {
    elements.locationLat.value = Number.isFinite(lat) ? String(lat) : '';
  }

  if (elements.locationLng instanceof HTMLInputElement) {
    elements.locationLng.value = Number.isFinite(lng) ? String(lng) : '';
  }

  updateLocationCoordinatesPreview(elements);
}

async function reverseGeocode(lat, lng) {
  const endpoint = new URL('https://nominatim.openstreetmap.org/reverse');
  endpoint.searchParams.set('lat', String(lat));
  endpoint.searchParams.set('lon', String(lng));
  endpoint.searchParams.set('format', 'jsonv2');
  endpoint.searchParams.set('accept-language', 'bg');

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error('Неуспешно извличане на адрес от картата.');
  }

  const payload = await response.json();
  const address = payload?.address || {};

  return sanitizeLocation(
    address.city
      || address.town
      || address.village
      || address.municipality
      || payload?.display_name
      || ''
  );
}

function initializeLeafletMap(elements) {
  if (locationMapState.map || !(elements.locationMapRoot instanceof HTMLElement) || !globalThis.L) {
    return;
  }

  const map = globalThis.L.map(elements.locationMapRoot, {
    center: [42.7339, 25.4858],
    zoom: 7,
    zoomControl: true
  });

  globalThis.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);

  map.on('click', (event) => {
    const { lat, lng } = event.latlng;
    locationMapState.selectedLat = lat;
    locationMapState.selectedLng = lng;

    if (!locationMapState.marker) {
      locationMapState.marker = globalThis.L.marker([lat, lng]).addTo(map);
    } else {
      locationMapState.marker.setLatLng([lat, lng]);
    }

    if (elements.locationMapStatus instanceof HTMLElement) {
      elements.locationMapStatus.textContent = `Избрана точка: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    }
  });

  locationMapState.map = map;
}

function setMapPositionFromProfile(elements) {
  const lat = Number(elements.locationLat?.value || '');
  const lng = Number(elements.locationLng?.value || '');

  if (!locationMapState.map || !Number.isFinite(lat) || !Number.isFinite(lng)) {
    return;
  }

  locationMapState.selectedLat = lat;
  locationMapState.selectedLng = lng;

  if (!locationMapState.marker) {
    locationMapState.marker = globalThis.L.marker([lat, lng]).addTo(locationMapState.map);
  } else {
    locationMapState.marker.setLatLng([lat, lng]);
  }

  locationMapState.map.setView([lat, lng], 11);
}

function updateLocationClearVisibility(elements) {
  if (!(elements.locationClear instanceof HTMLButtonElement) || !(elements.location instanceof HTMLInputElement)) {
    return;
  }

  elements.locationClear.classList.toggle('d-none', !elements.location.value.trim());
}

export function initializeLocationMapPicker(elements) {
  if (!(elements.locationModal instanceof HTMLElement) || !(elements.locationMapOpen instanceof HTMLButtonElement)) {
    return;
  }

  const modalApi = globalThis.bootstrap?.Modal
    ? globalThis.bootstrap.Modal.getOrCreateInstance(elements.locationModal)
    : null;

  locationMapState.modalApi = modalApi;

  if (elements.locationMapOpen.dataset.bound !== 'true') {
    elements.locationMapOpen.dataset.bound = 'true';
    elements.locationMapOpen.addEventListener('click', () => {
      initializeLeafletMap(elements);
      setMapPositionFromProfile(elements);
      modalApi?.show();
    });
  }

  if (elements.locationModal.dataset.bound !== 'true') {
    elements.locationModal.dataset.bound = 'true';
    elements.locationModal.addEventListener('shown.bs.modal', () => {
      initializeLeafletMap(elements);
      setMapPositionFromProfile(elements);
      if (locationMapState.map) {
        locationMapState.map.invalidateSize();
      }
    });
  }

  if (elements.locationMapGeolocate instanceof HTMLButtonElement && elements.locationMapGeolocate.dataset.bound !== 'true') {
    elements.locationMapGeolocate.dataset.bound = 'true';
    elements.locationMapGeolocate.addEventListener('click', () => {
      if (!navigator.geolocation) {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = 'Браузърът не поддържа геолокация.';
        }
        return;
      }

      navigator.geolocation.getCurrentPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;

        initializeLeafletMap(elements);

        locationMapState.selectedLat = lat;
        locationMapState.selectedLng = lng;

        if (!locationMapState.marker) {
          locationMapState.marker = globalThis.L.marker([lat, lng]).addTo(locationMapState.map);
        } else {
          locationMapState.marker.setLatLng([lat, lng]);
        }

        locationMapState.map?.setView([lat, lng], 13);

        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = `Текуща позиция: ${lat.toFixed(5)}, ${lng.toFixed(5)}`;
        }
      }, () => {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = 'Нямаме достъп до текущата позиция.';
        }
      }, {
        enableHighAccuracy: true,
        timeout: 10000
      });
    });
  }

  if (elements.locationMapApply instanceof HTMLButtonElement && elements.locationMapApply.dataset.bound !== 'true') {
    elements.locationMapApply.dataset.bound = 'true';
    elements.locationMapApply.addEventListener('click', async () => {
      const lat = locationMapState.selectedLat;
      const lng = locationMapState.selectedLng;

      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = 'Първо избери точка от картата.';
        }
        return;
      }

      if (elements.locationMapApply instanceof HTMLButtonElement) {
        elements.locationMapApply.disabled = true;
      }

      try {
        const locationName = await reverseGeocode(lat, lng);

        if (elements.location instanceof HTMLInputElement) {
          elements.location.value = locationName || elements.location.value;
        }

        updateLocationCoordinateInputs(elements, lat, lng);
        updateLocationClearVisibility(elements);
        modalApi?.hide();
      } catch (error) {
        if (elements.locationMapStatus instanceof HTMLElement) {
          elements.locationMapStatus.textContent = error.message || 'Неуспешно извличане на локацията.';
        }
      } finally {
        if (elements.locationMapApply instanceof HTMLButtonElement) {
          elements.locationMapApply.disabled = false;
        }
      }
    });
  }
}

export async function initializeLocationPicker(elements, getSuggestedLocations) {
  if (!(elements.location instanceof HTMLInputElement) || !(elements.locationList instanceof HTMLDataListElement)) {
    return;
  }

  let dynamicLocations = [];
  try {
    dynamicLocations = await getSuggestedLocations(50);
  } catch {
    dynamicLocations = [];
  }

  const suggestions = mergeLocationSuggestions(BULGARIAN_LOCATION_SUGGESTIONS, dynamicLocations, 80);
  const fragment = document.createDocumentFragment();

  suggestions.forEach((location) => {
    const option = document.createElement('option');
    option.value = location;
    fragment.append(option);
  });

  elements.locationList.replaceChildren(fragment);

  if (elements.location.dataset.bound !== 'true') {
    elements.location.dataset.bound = 'true';
    elements.location.addEventListener('input', () => {
      elements.location.value = sanitizeLocation(elements.location.value);
      updateLocationCoordinateInputs(elements, null, null);
      updateLocationClearVisibility(elements);
    });

    elements.location.addEventListener('blur', () => {
      elements.location.value = sanitizeLocation(elements.location.value);
      updateLocationClearVisibility(elements);
    });
  }

  if (elements.locationClear instanceof HTMLButtonElement && elements.locationClear.dataset.bound !== 'true') {
    elements.locationClear.dataset.bound = 'true';
    elements.locationClear.addEventListener('click', () => {
      if (!(elements.location instanceof HTMLInputElement)) {
        return;
      }

      elements.location.value = '';
      updateLocationCoordinateInputs(elements, null, null);
      updateLocationClearVisibility(elements);
      elements.location.focus();
    });
  }

  updateLocationClearVisibility(elements);
  updateLocationCoordinatesPreview(elements);
}