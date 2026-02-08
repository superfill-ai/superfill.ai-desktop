# Desktop App Assets

This directory contains all assets used by the Superfill.ai desktop application.

## Icons

The icons are sourced from the browser extension and landing page repositories.

### Icon Sizes

- `icon-16.png` - 16x16 pixels (taskbar, window chrome)
- `icon-32.png` - 32x32 pixels (window chrome on high DPI displays)
- `icon-48.png` - 48x48 pixels (Windows taskbar)
- `icon-128.png` - 128x128 pixels (macOS Dock)
- `icon-256.png` - 256x256 pixels (Windows installer)
- `icon-512.png` - 512x512 pixels (macOS app icon, Linux)
- `favicon.svg` - Vector format (scalable)
- `favicon.ico` - ICO format (Windows)
- `apple-touch-icon.png` - Apple touch icon format

### Platform-Specific Notes

#### macOS

- The app icon uses `.icns` format which is generated from the PNG files
- Recommended sizes: 16, 32, 64, 128, 256, 512, and 1024 pixels
- Icon path in `forge.config.ts`: `./assets/icons/icon-512`

#### Windows

- Uses `.ico` format or individual PNG files
- The installer icon is configured in `MakerSquirrel` settings
- Icon sizes: 16, 32, 48, 256 pixels

#### Linux

- Uses PNG format
- Configured in `MakerDeb` and `MakerRpm` settings
- Primary icon: `icon-512.png`

## Generating Platform Icons

To generate platform-specific icons from the PNG files:

### macOS (.icns)

```bash
# Install iconutil (comes with Xcode)
mkdir icon.iconset
sips -z 16 16 icon-512.png --out icon.iconset/icon_16x16.png
sips -z 32 32 icon-512.png --out icon.iconset/icon_16x16@2x.png
sips -z 32 32 icon-512.png --out icon.iconset/icon_32x32.png
sips -z 64 64 icon-512.png --out icon.iconset/icon_32x32@2x.png
sips -z 128 128 icon-512.png --out icon.iconset/icon_128x128.png
sips -z 256 256 icon-512.png --out icon.iconset/icon_128x128@2x.png
sips -z 256 256 icon-512.png --out icon.iconset/icon_256x256.png
sips -z 512 512 icon-512.png --out icon.iconset/icon_256x256@2x.png
sips -z 512 512 icon-512.png --out icon.iconset/icon_512x512.png
iconutil -c icns icon.iconset
```

### Windows (.ico)

Use ImageMagick or an online converter to combine multiple PNG sizes into a single `.ico` file.

## Adding New Assets

When adding new assets:

1. Place source files in the appropriate subdirectory
2. Optimize images for size (use WebP for photos, PNG for icons)
3. Update this README with details about the new assets
4. If needed, update `forge.config.ts` to include the new resources

## Asset Sources

- **Icons**: Copied from `/extension/public/` and `/landing-page/public/`
- **Feature Images**: Copied from `/landing-page/public/`
  - `hero_banner.webp` - Main hero banner for onboarding or splash screens
  - `dashboard.webp` - Dashboard preview image
  - `intelligent_field_matching.webp` - Feature illustration
  - `smart_memory_system.webp` - Feature illustration
  - `secure_data.webp` - Security feature illustration
  - `work_anywhere_full.webp` - Cross-platform feature illustration
- **Brand Assets**: TBD
- **Other Images**: TBD

## Usage in Code

Assets are exported from `assets/index.ts` for type-safe imports:

```typescript
import { icons, images, getIcon, getImage } from '@/assets';

// Use icons
const appIcon = icons.icon512;

// Use images
const heroImage = images.heroBanner;

// Use helper functions
const icon = getIcon('icon128');
const img = getImage('dashboard');
```
