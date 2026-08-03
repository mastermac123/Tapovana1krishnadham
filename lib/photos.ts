import fs from 'node:fs';
import path from 'node:path';

/**
 * The society's own photographs.
 *
 * The prototype draws each photograph position as a woven stripe so a missing
 * image never reads as a broken one. That weave is still the ground; a real
 * photograph simply layers over it.
 *
 * Drop the building photograph in as `public/building.jpg` and it appears in
 * all three positions — hero, courtyard and entrance detail. Until the file
 * exists, `buildingPhoto()` returns undefined and the bands render exactly as
 * they do now, with no broken-image request.
 *
 * Server-side only: pages resolve this and pass the result down as a prop.
 */

export const BUILDING_PHOTO = '/building.jpg';

const BUILDING_FILE = 'building.jpg';

export function buildingPhoto(): string | undefined {
  try {
    return fs.existsSync(path.join(process.cwd(), 'public', BUILDING_FILE))
      ? BUILDING_PHOTO
      : undefined;
  } catch {
    return undefined;
  }
}
