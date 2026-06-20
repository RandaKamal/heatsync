// 3 static scene presets — no clock, no auto-switching
export const PRESETS = {
  day: {
    sky: null,
    sunPosition: [0.6, 1.0, -0.4],
    ambient:  { intensity: 0.90, color: '#ddeeff' },
    dirLight: { intensity: 2.20, color: '#fffaf0' },
    fillLight: { intensity: 0.45, color: '#2288cc' },
    bg: '#4a90d4',   // solid blue sky — no shader needed
    stars: false,
    windowGlow: false,
  },
  evening: {
    sky: null,
    sunPosition: [-1.0, 0.1, 0],
    ambient:  { intensity: 0.60, color: '#ffbb66' },
    dirLight: { intensity: 0.70, color: '#ff7722' },
    fillLight: { intensity: 0.40, color: '#662200' },
    bg: '#c85a18',   // deep orange sky
    stars: false,
    windowGlow: true,
  },
  night: {
    sky: null,
    sunPosition: [0, -1, 0],
    ambient:  { intensity: 0.75, color: '#3a5c80' },
    dirLight: { intensity: 0.20, color: '#4a6888' },
    fillLight: { intensity: 0.35, color: '#1a3a60' },
    bg: '#1a2e44',   // dark blue night
    stars: true,
    windowGlow: true,
  },
}
