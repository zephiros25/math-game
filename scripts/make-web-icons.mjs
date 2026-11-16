// Makes the home-screen icons for the web app (public/): Sprout, the starter
// pet, on the warm background of the Sunny theme. iOS wants an opaque square
// icon (it rounds the corners itself), so there is no transparency.
// Run with: node scripts/make-web-icons.mjs

import sharp from 'sharp';

const BACKGROUND = '#FFF4E6';
const pet = new URL('../pets/sprout/img-idle.webp', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');

async function icon(size, file) {
  // The pet fills about 70% of the icon, leaving room for "maskable" cropping.
  const petSize = Math.round(size * 0.7);
  const petImage = await sharp(pet).resize(petSize, petSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: BACKGROUND } })
    .composite([{ input: petImage, gravity: 'center' }])
    .flatten({ background: BACKGROUND })
    .png({ compressionLevel: 9 })
    .toFile(new URL(`../public/${file}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
  console.log(`public/${file} (${size}×${size})`);
}

await icon(180, 'apple-touch-icon.png');
await icon(192, 'icon-192.png');
await icon(512, 'icon-512.png');
