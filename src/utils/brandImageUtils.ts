/**
 * Local ultra-lightweight WebP brand packshot images (<10KB each) 
 * with BASE_URL prefixing for GitHub Pages & production subpath deployments, 
 * plus instant CDN fallback.
 */

const BASE = (import.meta.env.BASE_URL || '/').replace(/\/$/, '');

interface BrandAsset {
  local: string;
  cdn: string;
}

export const BRITANNIA_BRAND_IMAGES: Record<string, BrandAsset> = {
  "50-50": {
    local: `${BASE}/brands/50-50.webp`,
    cdn: "https://media.britannia.co.in/5050_Maska_8c7fd48a66.png"
  },
  "50 50": {
    local: `${BASE}/brands/50-50.webp`,
    cdn: "https://media.britannia.co.in/5050_Maska_8c7fd48a66.png"
  },
  "MILK BIKIS": {
    local: `${BASE}/brands/milk_bikis.webp`,
    cdn: "https://media.britannia.co.in/Milk_Bikis_e8d2d3c4ff.png"
  },
  "GOOD DAY": {
    local: `${BASE}/brands/good_day.webp`,
    cdn: "https://media.britannia.co.in/Good_Day_Butter_Pack_306616402a.png"
  },
  "BOURBON": {
    local: `${BASE}/brands/bourbon.webp`,
    cdn: "https://media.britannia.co.in/Bourbon_thumbnail_ce29ecbf66.jpg"
  },
  "NUTRICHOICE": {
    local: `${BASE}/brands/nutrichoice.webp`,
    cdn: "https://media.britannia.co.in/Nutri_Choice_Zero_558f174502.png"
  },
  "MARIE GOLD": {
    local: `${BASE}/brands/marie_gold.webp`,
    cdn: "https://media.britannia.co.in/Marie_Marie_Gold_Pack_63a738e5fc.png"
  },
  "VITA MARIE": {
    local: `${BASE}/brands/vita_marie.webp`,
    cdn: "https://media.britannia.co.in/Marie_Vita_Marie_Gold_Pack_c4d421de26.jpg"
  },
  "WINKIN COW": {
    local: `${BASE}/brands/winkin_cow.webp`,
    cdn: "https://media.britannia.co.in/Winkin_Cow_Winkin_Shake_Strawberry_Pack_new_86a255fcda.jpg"
  },
  "WINKIN' COW": {
    local: `${BASE}/brands/winkin_cow.webp`,
    cdn: "https://media.britannia.co.in/Winkin_Cow_Winkin_Shake_Strawberry_Pack_new_86a255fcda.jpg"
  },
  "CHEESE": {
    local: `${BASE}/brands/cheese.webp`,
    cdn: "https://media.britannia.co.in/Bri_Cheese_Slices_200g_3a28116e01.png"
  },
  "TREAT": {
    local: `${BASE}/brands/treat.webp`,
    cdn: "https://media.britannia.co.in/Treat_Treat_Fruit_Cream_Orange_Pack_de8f06a186.png"
  },
  "JIM JAM": {
    local: `${BASE}/brands/jim_jam.webp`,
    cdn: "https://media.britannia.co.in/Jim_Jam_Pack_aa2e0478ea.png"
  },
  "LITTLE HEARTS": {
    local: `${BASE}/brands/little_hearts.webp`,
    cdn: "https://media.britannia.co.in/LH_New_Pack_1_62ac87e359.jpg"
  },
  "PURE MAGIC": {
    local: `${BASE}/brands/pure_magic.webp`,
    cdn: "https://media.britannia.co.in/chocolust_9bfd521ca5.png"
  },
  "TOASTEA": {
    local: `${BASE}/brands/toastea.webp`,
    cdn: "https://media.britannia.co.in/Premium_Rusk_Pack_ed00d578ed.png"
  },
  "RUSK": {
    local: `${BASE}/brands/toastea.webp`,
    cdn: "https://media.britannia.co.in/Premium_Rusk_Pack_ed00d578ed.png"
  },
  "GOBBLES": {
    local: `${BASE}/brands/gobbles.webp`,
    cdn: "https://media.britannia.co.in/Gobbles_Choco_Pack_6887befb99.png"
  },
  "CAKE": {
    local: `${BASE}/brands/cake.webp`,
    cdn: "https://media.britannia.co.in/Gobbles_Fruit_Pack_962ce53db1.png"
  },
  "MUFFILS": {
    local: `${BASE}/brands/muffils.webp`,
    cdn: "https://media.britannia.co.in/Muffils_Double_Choco_Pack_384e1a810d.png"
  },
  "CROISSANT": {
    local: `${BASE}/brands/croissant.webp`,
    cdn: "https://media.britannia.co.in/Treat_Croissant_Cocoa_47_Pack_85184e07f4.png"
  },
  "BREAD": {
    local: `${BASE}/brands/bread.webp`,
    cdn: "https://media.britannia.co.in/Brown_Bread_400g_T_and_T_3_D_FOP_0936c309ad.png"
  },
  "TIGER": {
    local: `${BASE}/brands/tiger.webp`,
    cdn: "https://media.britannia.co.in/Tiger_Glucose_Pack_1d1a5a0689.png"
  },
  "BISCAFE": {
    local: `${BASE}/brands/biscafe.webp`,
    cdn: "https://media.britannia.co.in/Biscafe_Pack_588093b453.png"
  },
  "NICE TIME": {
    local: `${BASE}/brands/nice_time.webp`,
    cdn: "https://media.britannia.co.in/Nice_time_Pack_d152ade9fe.png"
  },
  "DAIRY": {
    local: `${BASE}/brands/paneer.webp`,
    cdn: "https://media.britannia.co.in/Paneer_Pack_945b8641f1.png"
  },
  "PANEER": {
    local: `${BASE}/brands/paneer.webp`,
    cdn: "https://media.britannia.co.in/Paneer_Pack_945b8641f1.png"
  },
  "DAHI": {
    local: `${BASE}/brands/dahi.webp`,
    cdn: "https://media.britannia.co.in/Come_Alive_Daily_Fresh_Dahi_Pack_c6d6cbca7b.png"
  },
  "GHEE": {
    local: `${BASE}/brands/ghee.webp`,
    cdn: "https://media.britannia.co.in/Ghee_Hi_Aroma_Pouch_20_Pack_8c30a7e112.png"
  },
  "TIME PASS": {
    local: `${BASE}/brands/timepass.webp`,
    cdn: "https://media.britannia.co.in/5050_Timepass_5bc31fee57.png"
  },
  "TIMEPASS": {
    local: `${BASE}/brands/timepass.webp`,
    cdn: "https://media.britannia.co.in/5050_Timepass_5bc31fee57.png"
  },
  "WAFERS": {
    local: `${BASE}/brands/wafers.webp`,
    cdn: "https://media.britannia.co.in/1041_x_484_Choco_01e91a6a6f.png"
  }
};

export const DEFAULT_BRITANNIA_LOGO = `${BASE}/brands/logo.webp`;
export const DEFAULT_BRITANNIA_CDN_LOGO = "https://media.britannia.co.in/Britannia_Logo_fcce3225c0.png";

/**
 * Returns the matching WebP brand packshot image URL for a given brand name.
 */
export function getBritanniaBrandImage(brandName: string): string {
  if (!brandName) return DEFAULT_BRITANNIA_LOGO;
  
  const upper = brandName.toUpperCase().trim();
  
  if (BRITANNIA_BRAND_IMAGES[upper]) {
    return BRITANNIA_BRAND_IMAGES[upper].local;
  }

  for (const [key, item] of Object.entries(BRITANNIA_BRAND_IMAGES)) {
    if (upper.includes(key) || key.includes(upper)) {
      return item.local;
    }
  }

  return DEFAULT_BRITANNIA_LOGO;
}

/**
 * Returns the fallback CDN image URL if local webp fails to load.
 */
export function getBritanniaFallbackCDN(brandName: string): string {
  if (!brandName) return DEFAULT_BRITANNIA_CDN_LOGO;
  
  const upper = brandName.toUpperCase().trim();
  
  if (BRITANNIA_BRAND_IMAGES[upper]) {
    return BRITANNIA_BRAND_IMAGES[upper].cdn;
  }

  for (const [key, item] of Object.entries(BRITANNIA_BRAND_IMAGES)) {
    if (upper.includes(key) || key.includes(upper)) {
      return item.cdn;
    }
  }

  return DEFAULT_BRITANNIA_CDN_LOGO;
}
