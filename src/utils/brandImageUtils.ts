/**
 * Local ultra-lightweight WebP brand packshot images (<10KB each) 
 * for 0ms instant loading without external CDN dependencies.
 */

export const BRITANNIA_BRAND_IMAGES: Record<string, string> = {
  "50-50": "/brands/50-50.webp",
  "50 50": "/brands/50-50.webp",
  "MILK BIKIS": "/brands/milk_bikis.webp",
  "GOOD DAY": "/brands/good_day.webp",
  "BOURBON": "/brands/bourbon.webp",
  "NUTRICHOICE": "/brands/nutrichoice.webp",
  "MARIE GOLD": "/brands/marie_gold.webp",
  "VITA MARIE": "/brands/vita_marie.webp",
  "WINKIN COW": "/brands/winkin_cow.webp",
  "WINKIN' COW": "/brands/winkin_cow.webp",
  "CHEESE": "/brands/cheese.webp",
  "TREAT": "/brands/treat.webp",
  "JIM JAM": "/brands/jim_jam.webp",
  "LITTLE HEARTS": "/brands/little_hearts.webp",
  "PURE MAGIC": "/brands/pure_magic.webp",
  "TOASTEA": "/brands/toastea.webp",
  "RUSK": "/brands/toastea.webp",
  "GOBBLES": "/brands/gobbles.webp",
  "CAKE": "/brands/cake.webp",
  "MUFFILS": "/brands/muffils.webp",
  "CROISSANT": "/brands/croissant.webp",
  "BREAD": "/brands/bread.webp",
  "TIGER": "/brands/tiger.webp",
  "BISCAFE": "/brands/biscafe.webp",
  "NICE TIME": "/brands/nice_time.webp",
  "DAIRY": "/brands/paneer.webp",
  "PANEER": "/brands/paneer.webp",
  "DAHI": "/brands/dahi.webp",
  "GHEE": "/brands/ghee.webp",
  "TIME PASS": "/brands/timepass.webp",
  "TIMEPASS": "/brands/timepass.webp",
  "WAFERS": "/brands/wafers.webp"
};

export const DEFAULT_BRITANNIA_LOGO = "/brands/logo.webp";

/**
 * Returns the matching WebP brand packshot image URL for a given brand name.
 */
export function getBritanniaBrandImage(brandName: string): string {
  if (!brandName) return DEFAULT_BRITANNIA_LOGO;
  
  const upper = brandName.toUpperCase().trim();
  
  // Exact lookup
  if (BRITANNIA_BRAND_IMAGES[upper]) {
    return BRITANNIA_BRAND_IMAGES[upper];
  }

  // Partial keyword lookup
  for (const [key, url] of Object.entries(BRITANNIA_BRAND_IMAGES)) {
    if (upper.includes(key) || key.includes(upper)) {
      return url;
    }
  }

  return DEFAULT_BRITANNIA_LOGO;
}
