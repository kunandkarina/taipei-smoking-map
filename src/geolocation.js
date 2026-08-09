const GEOLOCATION_OPTIONS = {
  enableHighAccuracy: false,
  timeout: 10000,
  maximumAge: 0,
};

export const LocationErrorType = {
  UNSUPPORTED: 'unsupported',
  DENIED: 'denied',
  UNAVAILABLE: 'unavailable',
  TIMEOUT: 'timeout',
};

// GeolocationPositionError codes: 1 = PERMISSION_DENIED, 2 = POSITION_UNAVAILABLE, 3 = TIMEOUT.
const ERROR_TYPE_BY_CODE = {
  1: LocationErrorType.DENIED,
  2: LocationErrorType.UNAVAILABLE,
  3: LocationErrorType.TIMEOUT,
};

export const LOCATION_ERROR_MESSAGES = {
  [LocationErrorType.UNSUPPORTED]: '此瀏覽器不支援定位功能，已顯示全臺北市地圖。',
  [LocationErrorType.DENIED]: '未取得定位權限，已顯示全臺北市地圖。如需使用附近搜尋，請於瀏覽器設定中開啟定位權限。',
  [LocationErrorType.UNAVAILABLE]: '目前無法取得您的位置，已顯示全臺北市地圖。',
  [LocationErrorType.TIMEOUT]: '定位逾時，已顯示全臺北市地圖。',
};

// Fire-and-forget: does not block map/marker rendering, which proceed
// regardless of whether/when the permission prompt is answered.
export function locateUser({ onSuccess, onError }) {
  if (!('geolocation' in navigator)) {
    onError({ type: LocationErrorType.UNSUPPORTED });
    return;
  }

  navigator.geolocation.getCurrentPosition(
    (position) => {
      onSuccess({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      });
    },
    (error) => {
      const type = ERROR_TYPE_BY_CODE[error.code] || LocationErrorType.UNAVAILABLE;
      onError({ type });
    },
    GEOLOCATION_OPTIONS
  );
}
