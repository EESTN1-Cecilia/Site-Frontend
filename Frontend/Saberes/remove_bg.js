import fs from 'fs';
import { PNG } from 'pngjs';

const inputPath = 'src/assets/Logo_Tec.png';

fs.createReadStream(inputPath)
  .pipe(new PNG({ filterType: 4 }))
  .on('parsed', function() {
    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;
    // Find the radius of the outer circle
    const radius = Math.min(width, height) / 2;

    console.log(`Processing image: ${width}x${height}`);

    // Flood fill from corners for any white/near-white pixels
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (width * y + x) << 2;
        const r = this.data[idx];
        const g = this.data[idx + 1];
        const b = this.data[idx + 2];

        // Distance from center
        const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);

        // Outside the circular emblem or if it's white corner background
        if (dist > radius - 2) {
          this.data[idx + 3] = 0; // Fully transparent
        } else if (dist > radius - 6) {
          // Smooth anti-aliased edge
          const alphaFactor = Math.max(0, Math.min(1, (radius - 2 - dist) / 4));
          if (r > 230 && g > 230 && b > 230) {
            this.data[idx + 3] = Math.round(255 * alphaFactor);
          }
        } else {
          // If there are pure white background pixels near outer edge
          if (dist > radius * 0.95 && r > 240 && g > 240 && b > 240) {
            this.data[idx + 3] = 0;
          }
        }
      }
    }

    const outputBuffer = PNG.sync.write(this);
    fs.writeFileSync('src/assets/Logo_Tec.png', outputBuffer);
    fs.writeFileSync('public/Logo_Tec.png', outputBuffer);
    fs.writeFileSync('public/favicon.png', outputBuffer);
    console.log('Saved transparent Logo_Tec.png and favicon.png successfully!');
  });
