# Orbits

An interactive 3D view of the planets' paths through space. As the Sun moves through the galaxy, each orbit stretches into a helix. You can switch between reference frames (the Sun's galactic orbit or its motion relative to nearby stars), change the Sun's speed and the time span, and show the Moon and the other planets alongside Earth.

The radial and axial directions share one scale, so the helix angle you see is the true angle.

The stars behind the scene are the real naked-eye sky, turned so the Sun's arrow points where it's heading in the chosen frame: toward Hercules, near Vega, relative to nearby stars, and toward Cygnus around the galaxy.

## Running it

```sh
npm install
npm run dev        # http://localhost:3300
```

Other scripts: `npm test`, `npm run typecheck`, `npm run lint`, `npm run build`.

## Star data

`public/stars.bin` comes from the Yale Bright Star Catalogue, 5th edition (Hoffleit & Warren 1991): the 9,096 stars with positions, down to about magnitude 6.5. To rebuild it:

```sh
curl -O http://tdc-www.harvard.edu/catalogs/ybsc5.gz
node scripts/build-stars.mjs ybsc5.gz
```

## Deploying

The app is a standard Next.js project with one static page. Import the repository in Vercel and keep the default settings.
