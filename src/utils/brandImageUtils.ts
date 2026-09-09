/**
 * Utility mapping Britannia brands & categories to official high-resolution 
 * Britannia S3 Cloudfront CDN product packshot images scraped from britannia.co.in
 */

export const BRITANNIA_BRAND_IMAGES: Record<string, string> = {
  "50-50": "https://media.britannia.co.in/5050_Maska_8c7fd48a66.png",
  "50 50": "https://media.britannia.co.in/5050_Maska_8c7fd48a66.png",
  "MILK BIKIS": "https://media.britannia.co.in/Milk_Bikis_e8d2d3c4ff.png",
  "GOOD DAY": "https://media.britannia.co.in/Good_Day_Butter_Pack_306616402a.png",
  "BOURBON": "https://media.britannia.co.in/Bourbon_thumbnail_ce29ecbf66.jpg",
  "NUTRICHOICE": "https://media.britannia.co.in/Nutri_Choice_Zero_558f174502.png",
  "MARIE GOLD": "https://media.britannia.co.in/Marie_Marie_Gold_Pack_63a738e5fc.png",
  "VITA MARIE": "https://media.britannia.co.in/Marie_Vita_Marie_Gold_Pack_c4d421de26.jpg",
  "WINKIN COW": "https://media.britannia.co.in/Winkin_Cow_Winkin_Shake_Strawberry_Pack_new_86a255fcda.jpg",
  "WINKIN' COW": "https://media.britannia.co.in/Winkin_Cow_Winkin_Shake_Strawberry_Pack_new_86a255fcda.jpg",
  "CHEESE": "https://media.britannia.co.in/Bri_Cheese_Slices_200g_3a28116e01.png",
  "TREAT": "https://media.britannia.co.in/Treat_Treat_Fruit_Cream_Orange_Pack_de8f06a186.png",
  "JIM JAM": "https://media.britannia.co.in/Jim_Jam_Pack_aa2e0478ea.png",
  "LITTLE HEARTS": "https://media.britannia.co.in/LH_New_Pack_1_62ac87e359.jpg",
  "PURE MAGIC": "https://media.britannia.co.in/chocolust_9bfd521ca5.png",
  "TOASTEA": "https://media.britannia.co.in/Premium_Rusk_Pack_ed00d578ed.png",
  "RUSK": "https://media.britannia.co.in/Premium_Rusk_Pack_ed00d578ed.png",
  "GOBBLES": "https://media.britannia.co.in/Gobbles_Choco_Pack_6887befb99.png",
  "CAKE": "https://media.britannia.co.in/Gobbles_Fruit_Pack_962ce53db1.png",
  "MUFFILS": "https://media.britannia.co.in/Muffils_Double_Choco_Pack_384e1a810d.png",
  "CROISSANT": "https://media.britannia.co.in/Treat_Croissant_Cocoa_47_Pack_85184e07f4.png",
  "BREAD": "https://media.britannia.co.in/Brown_Bread_400g_T_and_T_3_D_FOP_0936c309ad.png",
  "TIGER": "https://media.britannia.co.in/Tiger_Glucose_Pack_1d1a5a0689.png",
  "BISCAFE": "https://media.britannia.co.in/Biscafe_Pack_588093b453.png",
  "NICE TIME": "https://media.britannia.co.in/Nice_time_Pack_d152ade9fe.png",
  "DAIRY": "https://media.britannia.co.in/Paneer_Pack_945b8641f1.png",
  "PANEER": "https://media.britannia.co.in/Paneer_Pack_945b8641f1.png",
  "DAHI": "https://media.britannia.co.in/Come_Alive_Daily_Fresh_Dahi_Pack_c6d6cbca7b.png",
  "GHEE": "https://media.britannia.co.in/Ghee_Hi_Aroma_Pouch_20_Pack_8c30a7e112.png",
  "TIME PASS": "https://media.britannia.co.in/5050_Timepass_5bc31fee57.png",
  "TIMEPASS": "https://media.britannia.co.in/5050_Timepass_5bc31fee57.png",
  "WAFERS": "https://media.britannia.co.in/1041_x_484_Choco_01e91a6a6f.png"
};

export const DEFAULT_BRITANNIA_LOGO = "https://media.britannia.co.in/Britannia_Logo_fcce3225c0.png";

/**
 * Returns the matching official Britannia brand image URL for a given brand name.
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
