// Which picture to try first for a category. A picture uploaded in Admin (our own image
// host) wins; an outside link (e.g. the starter data's Unsplash links, several of which
// are dead) comes after a photo of one of the category's products, so shoppers don't see
// a failed image swap to the fallback.
import { isOwnImage } from '@/lib/image-hosts';

export function categoryPictures(image?: string | null, cover?: string | null): (string | null | undefined)[] {
  const own = isOwnImage(image);
  return own ? [image, cover] : [cover, image];
}
