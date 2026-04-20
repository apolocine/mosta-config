# @mostajs/config

> Author: Dr Hamid MADANI &lt;drmdh@msn.com&gt;
> License: AGPL-3.0-or-later

Environment variable loader with **profile cascade** for the MostaJS ecosystem.
One `.env` file, multiple profiles (`TEST`, `DEV`, `STAGING`, `PROD`), switched
via a single `MOSTA_ENV` variable.

## Install

```bash
npm install @mostajs/config
```

## Why

Instead of juggling `.env.test`, `.env.development`, `.env.production` and
forgetting to sync them, keep **one** `.env` with profile-prefixed overrides.

```bash
# .env — commit the non-secret keys
MOSTA_ENV=TEST                   # active profile

DB_DIALECT=sqlite                # plain default (also the TEST default)
SGBD_URI=./data.sqlite

DEV_DB_DIALECT=postgres
DEV_SGBD_URI=postgres://localhost:5432/devdb

PROD_DB_DIALECT=mongodb
PROD_SGBD_URI=${MONGO_ATLAS_URI} # secrets come from the orchestrator
```

Resolution cascade (first non-empty wins) :
1. `${MOSTA_ENV}_${key}`
2. `${key}`
3. `fallback` arg
4. `undefined`

## Usage

```typescript
import { getEnv, getEnvBool, getEnvNumber, getCurrentProfile } from '@mostajs/config';

// String with fallback
const dialect = getEnv('DB_DIALECT', 'sqlite');

// Boolean (only 'true' — case-insensitive — returns true)
const showSql = getEnvBool('DB_SHOW_SQL', false);

// Number with fallback
const poolSize = getEnvNumber('DB_POOL_SIZE', 10);

// Diagnostic
console.log(`Running in profile: ${getCurrentProfile() ?? 'none'}`);
```

## Silent fallback guarantee

**The loader never throws on missing keys.** If a profile override is absent,
it silently falls back to the plain variable or to the `fallback` argument.
Callers decide whether `undefined` is a fatal condition.

```typescript
process.env.MOSTA_ENV = 'STAGING';
// Neither STAGING_REDIS_URL nor REDIS_URL defined
getEnv('REDIS_URL')                 // undefined (no throw)
getEnv('REDIS_URL', 'redis://...')  // 'redis://...' (fallback)
```

## Empty strings are treated as unset

To avoid accidental blank values silently propagating, an empty string in a
profile override **falls through** to the plain variable :

```bash
TEST_DB_DIALECT=
DB_DIALECT=sqlite
```
```typescript
getEnv('DB_DIALECT')  // 'sqlite', not ''
```

## Whitespace in `MOSTA_ENV` is trimmed

```bash
MOSTA_ENV=  TEST
```
Resolves to profile `TEST`. `getCurrentProfile()` returns `'TEST'`.

## Naming convention

- Profile name → **uppercase** (`TEST`, `DEV`, `PROD`, `STAGING`)
- Variable name → **UPPER_SNAKE_CASE** (`DB_DIALECT`, `SGBD_URI`, `REDIS_URL`)
- Profiled key → `{PROFILE}_{VARIABLE}` — underscore separator
  (`TEST_DB_DIALECT`, not `TEST.DB_DIALECT` because the dot is rejected by
  POSIX shells)

## Testing

```bash
npm run build
npm test
```

## License

AGPL-3.0-or-later. See [LICENSE](./LICENSE).
