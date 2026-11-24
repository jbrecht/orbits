/** AU travelled in one sidereal year at 1 km/s (~0.210945). */
export const AU_PER_YR_PER_KMS = (365.25636 * 86400) / 149597870.7;
export const ORBIT_RADIUS_AU = 1.0;
export const CIRCUMFERENCE_AU = 2 * Math.PI * ORBIT_RADIUS_AU;

/**
 * One scale for both the radial and the axial direction, so the helix angle
 * on screen is the true angle. Never scale one axis on its own.
 */
export const WORLD_UNITS_PER_AU = 3.0;
export const RADIUS_UNITS = ORBIT_RADIUS_AU * WORLD_UNITS_PER_AU;

export const MOON_PERIOD_YR = 27.321661 / 365.25636;
/**
 * The true Earth–Moon distance (~0.0077 world units) is smaller than Earth's
 * sphere, so the Moon orbits at this made-up radius to stay visible.
 */
export const MOON_VISUAL_RADIUS_UNITS = 0.95;

/** The Sun's speed around the galactic centre (~251 km/s), in AU per Earth year. */
export const GALACTIC_PITCH_AU = 52.95;

export const PITCH_RANGE = { min: 0.2, max: 60, step: 0.05 } as const;
export const SPAN_RANGE = { min: 1, max: 100, step: 0.5 } as const;

/** One sweep of the visible helix takes this long, whatever the span. */
export const SWEEP_SECONDS = 10;
