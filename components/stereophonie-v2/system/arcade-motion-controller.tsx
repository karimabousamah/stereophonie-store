"use client";

/**
 * Stereophonie Arcade Motion Controller
 *
 * Intentionally disabled.
 *
 * Global DOM mutation before/during React hydration caused
 * server/client markup mismatches and stale Turbopack chunk
 * failures during development.
 *
 * Motion should be implemented declaratively inside React
 * components rather than by mutating rendered DOM globally.
 */
export default function ArcadeMotionController() {
  return null;
}
