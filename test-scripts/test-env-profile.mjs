#!/usr/bin/env node
// Author: Dr Hamid MADANI drmdh@msn.com
// Test: MOSTA_ENV profile cascade — ensures silent fallback when overrides are absent.
//
// Run:  node test-scripts/test-env-profile.mjs
//       (from mosta-config/ root, after `npm run build`)

import {
  getEnv,
  getEnvBool,
  getEnvNumber,
  getCurrentProfile,
} from '../dist/index.js';

let passed = 0;
let failed = 0;

function assertEq(actual, expected, label) {
  const ok = actual === expected;
  if (ok) { console.log(`  ✓ ${label}`); passed++; }
  else    { console.log(`  ✗ ${label}\n      expected: ${JSON.stringify(expected)}\n      got:      ${JSON.stringify(actual)}`); failed++; }
}

function resetEnv() {
  for (const k of Object.keys(process.env)) {
    if (k === 'MOSTA_ENV'
     || k.startsWith('TEST_') || k.startsWith('DEV_')
     || k.startsWith('PROD_') || k.startsWith('STAGING_')
     || k === 'DB_DIALECT' || k === 'SGBD_URI'
     || k.startsWith('DB_') || k.startsWith('REDIS_')) {
      delete process.env[k];
    }
  }
}

console.log('═══════════════════════════════════════════════════════════');
console.log(' @mostajs/config — MOSTA_ENV profile cascade');
console.log('═══════════════════════════════════════════════════════════\n');

// ─────────────────────────────────────────────────────────────
console.log('[1] No profile, plain var present');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.DB_DIALECT = 'postgres';
assertEq(getEnv('DB_DIALECT'),  'postgres', 'getEnv returns plain value');
assertEq(getCurrentProfile(),   undefined,  'getCurrentProfile undefined when no profile');

// ─────────────────────────────────────────────────────────────
console.log('\n[2] Profile set, profiled var takes priority');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV        = 'TEST';
process.env.DB_DIALECT       = 'postgres';
process.env.TEST_DB_DIALECT  = 'sqlite';
assertEq(getEnv('DB_DIALECT'),  'sqlite',   'profiled wins over plain');
assertEq(getCurrentProfile(),   'TEST',     'getCurrentProfile returns TEST');

// ─────────────────────────────────────────────────────────────
console.log('\n[3] Profile set but profiled var ABSENT → falls back to plain (no crash)');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV   = 'DEV';
process.env.DB_DIALECT  = 'mongodb';
// No DEV_DB_DIALECT defined
assertEq(getEnv('DB_DIALECT'),  'mongodb',  'falls back to plain when profiled absent');

// ─────────────────────────────────────────────────────────────
console.log('\n[4] Both profiled and plain ABSENT → returns undefined or fallback (no crash)');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV = 'STAGING';
// Neither STAGING_SGBD_URI nor SGBD_URI
assertEq(getEnv('SGBD_URI'),                      undefined,          'undefined when nothing set');
assertEq(getEnv('SGBD_URI', './default.sqlite'),  './default.sqlite', 'returns fallback when nothing set');

// ─────────────────────────────────────────────────────────────
console.log('\n[5] Empty-string values are treated as "not set"');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV       = 'TEST';
process.env.TEST_DB_DIALECT = '';           // empty = not set
process.env.DB_DIALECT      = 'sqlite';
assertEq(getEnv('DB_DIALECT'), 'sqlite',    'empty profiled falls through to plain');

// ─────────────────────────────────────────────────────────────
console.log('\n[6] MOSTA_ENV with surrounding whitespace is trimmed');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV       = '  TEST  ';
process.env.TEST_DB_DIALECT = 'sqlite';
assertEq(getEnv('DB_DIALECT'), 'sqlite',    'whitespace trimmed in profile name');
assertEq(getCurrentProfile(),  'TEST',      'getCurrentProfile returns trimmed value');

// ─────────────────────────────────────────────────────────────
console.log('\n[7] Empty MOSTA_ENV is treated as "no profile"');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV  = '';
process.env.DB_DIALECT = 'mongodb';
assertEq(getEnv('DB_DIALECT'), 'mongodb',   'empty profile ignored');
assertEq(getCurrentProfile(),  undefined,   'getCurrentProfile undefined for empty profile');

// ─────────────────────────────────────────────────────────────
console.log('\n[8] getEnvBool parsing');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV        = 'TEST';
process.env.TEST_DB_SHOW_SQL = 'true';
process.env.DB_DEBUG         = 'TRUE';      // case-insensitive
process.env.DB_CACHE_ENABLED = 'yes';       // not 'true' → false
assertEq(getEnvBool('DB_SHOW_SQL'),       true,  'getEnvBool reads profiled true');
assertEq(getEnvBool('DB_DEBUG'),          true,  'getEnvBool is case-insensitive');
assertEq(getEnvBool('DB_CACHE_ENABLED'),  false, 'getEnvBool only matches "true"');
assertEq(getEnvBool('DB_MISSING'),        false, 'getEnvBool default false when absent');
assertEq(getEnvBool('DB_MISSING', true),  true,  'getEnvBool uses fallback');

// ─────────────────────────────────────────────────────────────
console.log('\n[9] getEnvNumber parsing and fallback on NaN');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV         = 'TEST';
process.env.TEST_DB_POOL_SIZE = '42';
process.env.DB_BATCH_SIZE     = 'not-a-number';
assertEq(getEnvNumber('DB_POOL_SIZE'),       42,        'getEnvNumber parses int');
assertEq(getEnvNumber('DB_BATCH_SIZE'),      undefined, 'NaN → undefined');
assertEq(getEnvNumber('DB_BATCH_SIZE', 100), 100,       'NaN → fallback');
assertEq(getEnvNumber('DB_MISSING'),         undefined, 'undefined when absent');
assertEq(getEnvNumber('DB_MISSING', 10),     10,        'fallback when absent');

// ─────────────────────────────────────────────────────────────
console.log('\n[10] Multiple profiles coexist — switching MOSTA_ENV changes result');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.DEV_DB_DIALECT  = 'postgres';
process.env.TEST_DB_DIALECT = 'sqlite';
process.env.PROD_DB_DIALECT = 'mongodb';

process.env.MOSTA_ENV = 'DEV';
assertEq(getEnv('DB_DIALECT'), 'postgres', 'MOSTA_ENV=DEV → postgres');

process.env.MOSTA_ENV = 'TEST';
assertEq(getEnv('DB_DIALECT'), 'sqlite',   'MOSTA_ENV=TEST → sqlite');

process.env.MOSTA_ENV = 'PROD';
assertEq(getEnv('DB_DIALECT'), 'mongodb',  'MOSTA_ENV=PROD → mongodb');

// ─────────────────────────────────────────────────────────────
console.log('\n[11] Unknown profile falls back silently (no crash)');
// ─────────────────────────────────────────────────────────────
resetEnv();
process.env.MOSTA_ENV  = 'UNKNOWN_PROFILE';
process.env.DB_DIALECT = 'sqlite';
// No UNKNOWN_PROFILE_* variables defined anywhere
assertEq(getEnv('DB_DIALECT'),   'sqlite',          'unknown profile → plain fallback');
assertEq(getEnv('OTHER_VAR'),    undefined,         'unknown profile + no plain → undefined');
assertEq(getEnv('OTHER_VAR',' d'), ' d',            'unknown profile + no plain → fallback arg');

// ─────────────────────────────────────────────────────────────
console.log('\n[12] Only fallback, no env at all');
// ─────────────────────────────────────────────────────────────
resetEnv();
assertEq(getEnv('ANY',       'default'), 'default', 'fallback used when nothing set');
assertEq(getEnv('ANY'),                  undefined, 'undefined without fallback');
assertEq(getCurrentProfile(),            undefined, 'undefined profile returned cleanly');

// ─────────────────────────────────────────────────────────────
console.log('\n═══════════════════════════════════════════════════════════');
console.log(` Results: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════');

process.exit(failed === 0 ? 0 : 1);
