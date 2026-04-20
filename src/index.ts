// @mostajs/config — Environment variable loader with profile override cascade
// Author: Dr Hamid MADANI drmdh@msn.com
//
// Primary use case : one `.env` file, multiple profiles (TEST, DEV, STAGING,
// PROD), switched via `MOSTA_ENV`. Silent fallback when profile overrides are
// absent — the loader never throws on missing optional keys.

/**
 * Resolution cascade (first non-empty value wins) :
 *   1. `${MOSTA_ENV}_${key}`  — profile-prefixed (if MOSTA_ENV is defined and non-empty)
 *   2. `${key}`               — plain env variable
 *   3. `fallback`             — provided default
 *   4. `undefined`            — nothing found, no default
 *
 * Empty-string values (`''`) are treated as "not set" so a blank profile
 * override falls through to the plain variable rather than returning `''`.
 *
 * Example :
 *   # .env
 *   MOSTA_ENV=TEST
 *   DB_DIALECT=postgres               # default
 *   TEST_DB_DIALECT=sqlite            # TEST override
 *   TEST_SGBD_URI=./test.sqlite
 *
 *   getEnv('DB_DIALECT')                  // 'sqlite'
 *   getEnv('SGBD_URI')                    // './test.sqlite'
 *   getEnv('DB_SCHEMA_STRATEGY')          // undefined (no crash)
 *   getEnv('DB_SCHEMA_STRATEGY', 'none')  // 'none'
 *
 * @param key       Logical variable name (without profile prefix).
 * @param fallback  Default value if neither profiled nor plain variable is set.
 * @returns         Resolved value. Return type narrows to `string` when a
 *                  string `fallback` is provided, otherwise `string | undefined`.
 */
export function getEnv(key: string, fallback: string): string;
export function getEnv(key: string, fallback?: undefined): string | undefined;
export function getEnv(key: string, fallback?: string): string | undefined;
export function getEnv(key: string, fallback?: string): string | undefined {
  const profile = process.env.MOSTA_ENV;

  if (profile && profile.trim() !== '') {
    const profiledKey = `${profile.trim()}_${key}`;
    const profiledValue = process.env[profiledKey];
    if (profiledValue !== undefined && profiledValue !== '') {
      return profiledValue;
    }
  }

  const plainValue = process.env[key];
  if (plainValue !== undefined && plainValue !== '') {
    return plainValue;
  }

  return fallback;
}

/**
 * Same resolution as {@link getEnv} but returns a boolean.
 * Returns `true` only if the resolved value is literally `'true'` (case-insensitive, trimmed).
 * Any other value (including `'false'`, `'0'`, `'no'`, etc.) returns `false`.
 *
 * @param key       Variable name.
 * @param fallback  Default boolean when nothing is set (default: `false`).
 */
export function getEnvBool(key: string, fallback: boolean = false): boolean {
  const value = getEnv(key);
  if (value === undefined) return fallback;
  return value.trim().toLowerCase() === 'true';
}

/**
 * Same resolution as {@link getEnv} but parsed as a finite number.
 * Returns `fallback` if the value is missing or not a finite number.
 *
 * @param key       Variable name.
 * @param fallback  Default value when missing or unparseable.
 */
export function getEnvNumber(key: string, fallback: number): number;
export function getEnvNumber(key: string, fallback?: undefined): number | undefined;
export function getEnvNumber(key: string, fallback?: number): number | undefined;
export function getEnvNumber(key: string, fallback?: number): number | undefined {
  const value = getEnv(key);
  if (value === undefined) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Returns the currently active profile name (trimmed), or `undefined` if no
 * profile is set. Useful for logs / diagnostics.
 */
export function getCurrentProfile(): string | undefined {
  const profile = process.env.MOSTA_ENV;
  return profile && profile.trim() !== '' ? profile.trim() : undefined;
}
