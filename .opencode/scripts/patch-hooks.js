#!/usr/bin/env node
/**
 * Patch the hooks npm package to fix undefined method access bug
 * This runs automatically when OpenCode starts with this .opencode directory
 */

const fs = require('fs');
const path = require('path');

const hooksPath = path.join(process.env.HOME, '.cache', 'opencode', 'node_modules', 'hooks', 'hooks.js');

if (!fs.existsSync(hooksPath)) {
  console.log('[patch-hooks] hooks.js not found, skipping patch');
  process.exit(0);
}

const content = fs.readFileSync(hooksPath, 'utf8');

// Check if already patched
if (content.includes('Safety check: return early if method doesn\'t exist')) {
  console.log('[patch-hooks] Already patched');
  process.exit(0);
}

// Apply patch
const patched = content.replace(
  /_lazySetupHooks: function \(proto, methodName, errorCb\) \{\s*if \('undefined' === typeof proto\[methodName\]\.numAsyncPres\) \{/,
  `_lazySetupHooks: function (proto, methodName, errorCb) {
    // Safety check: return early if method doesn't exist
    if (!proto || !methodName || !proto[methodName]) {
      return;
    }
    if ('undefined' === typeof proto[methodName].numAsyncPres) {`
);

if (patched === content) {
  console.log('[patch-hooks] Pattern not found, hooks.js may have changed');
  process.exit(1);
}

fs.writeFileSync(hooksPath, patched);
console.log('[patch-hooks] Successfully patched hooks.js');
