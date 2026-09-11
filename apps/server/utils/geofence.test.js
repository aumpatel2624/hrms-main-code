import assert from "node:assert/strict";
import { haversineDistance } from "./geofence.js";
assert.equal(haversineDistance(0, 0, 0, 0), 0);
// One degree along the equator: circumference / 360 = 111194.93m.
assert.ok(Math.abs(haversineDistance(0, 0, 0, 1) - 111194.93) < 0.01);
// London (51.5074,-0.1278) to Paris (48.8566,2.3522): approx 343.56 km.
assert.ok(Math.abs(haversineDistance(51.5074, -0.1278, 48.8566, 2.3522) - 343556) < 2);
assert.ok(Math.abs(haversineDistance(0, 0, 0, 180) - 20015086.8) < 0.1);
console.log("geofence: identical, equatorial, London–Paris and antipodal pairs passed");
