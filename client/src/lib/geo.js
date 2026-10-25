export const DEFAULT_CENTER = { lat: 12.9352, lng: 77.6245, label: 'Koramangala, Bengaluru' };

export function getPosition() {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve({ ...DEFAULT_CENTER, source: 'fallback' });
    const done = (loc) => resolve(loc);
    const timer = setTimeout(() => done({ ...DEFAULT_CENTER, source: 'fallback' }), 7000);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        done({ lat: pos.coords.latitude, lng: pos.coords.longitude, source: 'gps' });
      },
      () => {
        clearTimeout(timer);
        done({ ...DEFAULT_CENTER, source: 'fallback' });
      },
      { timeout: 6000, maximumAge: 120000 }
    );
  });
}
