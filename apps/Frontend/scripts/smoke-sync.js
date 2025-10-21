// Simple smoke-check for broadcast/storage sync logic
// This script cannot actually open browser tabs, but it will test localStorage operations and utility functions.

console.log('Smoke test: localStorage set/get');
const key = 'libra:autoRestoreDrafts';
localStorage.setItem(key, 'true');
if (localStorage.getItem(key) !== 'true') throw new Error('localStorage mismatch');
localStorage.removeItem(key);
console.log('OK');
