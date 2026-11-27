// Builds public/stars.bin from the Yale Bright Star Catalogue, 5th edition.
//
//   curl -O http://tdc-www.harvard.edu/catalogs/ybsc5.gz
//   node scripts/build-stars.mjs ybsc5.gz
//
// The catalogue is also VizieR V/50 (https://cdsarc.cds.unistra.fr/ftp/V/50/).
// Output: one 10-byte record per star, brightest first, little-endian Int16s:
// the star's direction in galactic coordinates as a unit vector (x toward the
// Galactic centre, y toward l = 90°, z toward the north galactic pole) times
// 32767, then V magnitude × 100, then B−V colour × 100 (−32768 when unknown).
// src/lib/orbit/sky.ts reads it.
import { readFileSync, writeFileSync } from "node:fs";
import { gunzipSync } from "node:zlib";

const [input, output = "public/stars.bin"] = process.argv.slice(2);
if (!input) {
  console.error("Usage: node scripts/build-stars.mjs <ybsc5 or ybsc5.gz> [output]");
  process.exit(1);
}

let raw = readFileSync(input);
if (input.endsWith(".gz")) raw = gunzipSync(raw);

// Byte ranges from the catalogue's ReadMe (1-based, inclusive).
const field = (line, from, to) => line.slice(from - 1, to).trim();

const stars = [];
for (const line of raw.toString("latin1").split("\n")) {
  const glon = field(line, 91, 96);
  const glat = field(line, 97, 102);
  const vmag = field(line, 103, 107);
  // A few entries are novae or galaxies removed from the catalogue, with no position.
  if (!glon || !glat || !vmag) continue;
  const bv = field(line, 110, 114);
  const l = (Number(glon) * Math.PI) / 180;
  const b = (Number(glat) * Math.PI) / 180;
  stars.push({
    x: Math.cos(b) * Math.cos(l),
    y: Math.cos(b) * Math.sin(l),
    z: Math.sin(b),
    vmag: Number(vmag),
    bv: bv === "" ? null : Number(bv),
  });
}
stars.sort((a, b) => a.vmag - b.vmag);

const out = new DataView(new ArrayBuffer(stars.length * 10));
stars.forEach((s, i) => {
  const o = i * 10;
  out.setInt16(o, Math.round(s.x * 32767), true);
  out.setInt16(o + 2, Math.round(s.y * 32767), true);
  out.setInt16(o + 4, Math.round(s.z * 32767), true);
  out.setInt16(o + 6, Math.round(s.vmag * 100), true);
  out.setInt16(o + 8, s.bv === null ? -32768 : Math.round(s.bv * 100), true);
});
writeFileSync(output, new Uint8Array(out.buffer));
console.log(`${stars.length} stars, V ${stars[0].vmag} to ${stars.at(-1).vmag}, ${out.byteLength} bytes → ${output}`);
