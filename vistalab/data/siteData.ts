export const initialBrands = [
  { id: 'b1', name: "L'affair", category: "Personal Care", origin: "Malaysia", description: "Premium personal care line crafted for everyday skin nourishment and freshness.", featured: true, logoText: "L'AFFAIR" },
  { id: 'b2', name: "Elizzer Natural", category: "Beauty & Body Care", origin: "Malaysia", description: "Natural body wash, hand wash, and lotion formulated with pure botanical extracts.", featured: true, logoText: "ELIZZER" },
  { id: 'b3', name: "Be Love", category: "Baby Care", origin: "Malaysia", description: "Gentle baby wipes, baby shampoo, and mild cleansing solutions for sensitive skin.", featured: true, logoText: "BE LOVE" },
  { id: 'b4', name: "Milk Safe & Clean", category: "Household Care", origin: "Malaysia", description: "Trusted household hygiene products and dishwashing liquids designed for maximum safety.", featured: true, logoText: "MILK SAFE" },
  { id: 'b5', name: "SoWell", category: "Personal Care", origin: "Malaysia", description: "Everyday hygiene and personal wellness essential products for modern families.", featured: true, logoText: "SOWELL" },
  { id: 'b6', name: "Sofeel", category: "Personal Care", origin: "Malaysia", description: "Ultra-soft cotton products, wet wipes, and facial tissue paper.", featured: true, logoText: "SOFEEL" },
  { id: 'b7', name: "V-Shine", category: "Household Care", origin: "Malaysia", description: "Powerful floor cleaners and surface polishing solutions.", featured: false, logoText: "V-SHINE" },
  { id: 'b8', name: "Jasmy", category: "Beauty & Body Care", origin: "Malaysia", description: "Aromatic shower creams and body scrubbing products.", featured: false, logoText: "JASMY" },
  { id: 'b9', name: "Nisha", category: "Personal Care", origin: "Malaysia", description: "Hair care and specialty hygiene formulas.", featured: false, logoText: "NISHA" },
  { id: 'b10', name: "Shotz", category: "Food & Confectionery", origin: "Malaysia", description: "Refreshing fruit drinks and instant beverages.", featured: false, logoText: "SHOTZ" },
  { id: 'b11', name: "Tango", category: "Food & Confectionery", origin: "Malaysia", description: "Crispy chocolate wafers and sweet snacks popular among youth.", featured: true, logoText: "TANGO" },
  { id: 'b12', name: "BIKA", category: "Food & Confectionery", origin: "Malaysia", description: "Iconic savory corn snacks and seafood-flavored crisps.", featured: true, logoText: "BIKA" }
];

export const initialProducts = [
  { id: 'p1', name_en: "L'affair Nourishing Shower Cream 1000ml", name_kh: "ក្រែមងូតទឹកបំប៉នស្បែក L'affair 1000ml", brand: "L'affair", category: "Personal Care", origin: "Malaysia", sizes: "1000ml, 500ml", specs: "Enriched with Goat Milk & Vitamin E. Paraben-free.", featured: true, imageBg: "bg-blue-100", imageBadge: "Shower" },
  { id: 'p2', name_en: "Elizzer Natural Goat Milk Body Wash 1200ml", name_kh: "សាប៊ូងូតទឹកពពែ Elizzer Natural 1200ml", brand: "Elizzer Natural", category: "Beauty & Body Care", origin: "Malaysia", sizes: "1200ml Refill Pack", specs: "100% Organic Goat Milk extract. Deep moisture.", featured: true, imageBg: "bg-amber-100", imageBadge: "Body Care" },
  { id: 'p3', name_en: "Be Love Gentle Baby Wipes (80 Sheets)", name_kh: "កន្សែងសើមទារក Be Love (80 សន្លឹក)", brand: "Be Love", category: "Baby Care", origin: "Malaysia", sizes: "80 sheets x 3 Pack", specs: "99% Pure Water, Fragrance-free, Hypoallergenic.", featured: true, imageBg: "bg-pink-100", imageBadge: "Baby" },
  { id: 'p4', name_en: "Milk Safe & Clean Antibacterial Dishwasher 750ml", name_kh: "ទឹកលាងចានកម្ចាត់មេរោគ Milk Safe 750ml", brand: "Milk Safe & Clean", category: "Household Care", origin: "Malaysia", sizes: "750ml Bottle", specs: "Tough on grease, soft on hands. Fresh Lime aroma.", featured: true, imageBg: "bg-emerald-100", imageBadge: "Household" },
  { id: 'p5', name_en: "SoWell Antibacterial Hand Sanitizer Spray 100ml", name_kh: "ស្ព្រេអនាម័យដៃ SoWell 100ml", brand: "SoWell", category: "Personal Care", origin: "Malaysia", sizes: "100ml, 500ml", specs: "75% Food Grade Alcohol. Kills 99.9% germs.", featured: false, imageBg: "bg-cyan-100", imageBadge: "Hygiene" },
  { id: 'p6', name_en: "BIKA Seafood Flavored Snack 70g", name_kh: "នំស្រួយរសជាតិគ្រឿងសមុទ្រ BIKA 70g", brand: "BIKA", category: "Food & Confectionery", origin: "Malaysia", sizes: "70g Family Pack", specs: "Crunchy baked corn snack with authentic taste.", featured: true, imageBg: "bg-orange-100", imageBadge: "Snack" },
  { id: 'p7', name_en: "Tango Chocolate Crunchy Wafer Box 12s", name_kh: "នំស្រួយស្រោបសូកូឡា Tango 12 ប្រអប់", brand: "Tango", category: "Food & Confectionery", origin: "Malaysia", sizes: "12 Packs x 20g", specs: "Double layered chocolate cream wafer.", featured: true, imageBg: "bg-amber-200", imageBadge: "Confectionery" },
  { id: 'p8', name_en: "V-Shine Multi-Surface Floor Cleaner 2L", name_kh: "ទឹកជូតការ៉ូ V-Shine 2L", brand: "V-Shine", category: "Household Care", origin: "Malaysia", sizes: "2 Liter Bottle", specs: "Quick drying non-sticky formula with Lavender scent.", featured: false, imageBg: "bg-indigo-100", imageBadge: "Home" }
];

export const initialNews = [
  { id: 'n1', title_en: "VistaLab Expands Distribution Hubs to Siem Reap & Battambang", title_kh: "VistaLab ពង្រីកមជ្ឈមណ្ឌលចែកចាយទៅកាន់ខេត្តសៀមរាប និងបាត់ដំបង", date: "2026-03-15", category: "Company", excerpt_en: "Strengthening supply chain response times across Northern Cambodia with new logistics partnerships.", excerpt_kh: "ពង្រឹងល្បឿនចែកចាយទំនិញនៅភាគខាងជើងនៃប្រទេសកម្ពុជាជាមួយដៃគូដឹកជញ្ជូនថ្មី។", imageBg: "bg-blue-800" },
  { id: 'n2', title_en: "L'affair & Elizzer Product Range Launches New Eco Packaging in Cambodia", title_kh: "ផលិតផល L'affair និង Elizzer ប្រកាសចេញសំបកវេចខ្ចប់បរិស្ថានថ្មីនៅកម្ពុជា", date: "2026-02-28", category: "Products", excerpt_en: "Introducing 100% recyclable bottles for premium shower gels in response to consumer demand.", excerpt_kh: "ណែនាំដបអាចកែច្នៃបាន ១០០% សម្រាប់សាប៊ូងូតទឹក ដើម្បីឆ្លើយតបតម្រូវការអតិថិជន។", imageBg: "bg-emerald-800" },
  { id: 'n3', title_en: "VistaLab Cambodia Hosts Annual Retailer Partnership Summit 2026", title_kh: "VistaLab Cambodia រៀបចំសន្និសីទប្រចាំឆ្នាំជាមួយដៃគូលក់រាយ ២០២៦", date: "2026-01-20", category: "Events", excerpt_en: "Over 150 local store owners gathered in Phnom Penh to discuss market trends and promotion incentives.", excerpt_kh: "ម្ចាស់ហាងទំនិញជាង ១៥០ នាក់បានជួបជុំគ្នានៅភ្នំពេញដើម្បីពិភាក្សាអំពីការផ្សព្វផ្សាយ។", imageBg: "bg-indigo-800" }
];

export const distributionHubs = [
  { id: 'h1', name: "Phnom Penh Central HQ", locationQuery: "Phnom Penh, Cambodia", type: "Main Warehouse & Hub", status: "Active", count: "500+ Outlets" },
  { id: 'h2', name: "Siem Reap Regional Hub", locationQuery: "Siem Reap, Cambodia", type: "Distribution Hub", status: "Active", count: "180+ Outlets" },
  { id: 'h3', name: "Battambang Western Hub", locationQuery: "Battambang, Cambodia", type: "Distribution Hub", status: "Active", count: "140+ Outlets" },
  { id: 'h4', name: "Kampot & Sihanoukville Hub", locationQuery: "Kampot, Cambodia", type: "Southern Hub", status: "Active", count: "120+ Outlets" },
  { id: 'h5', name: "Tbong Khmum / Kampong Cham", locationQuery: "Kampong Cham, Cambodia", type: "Eastern Hub", status: "Active", count: "110+ Outlets" }
];

export const cambodianProvinces = [
  { name: 'Banteay Meanchey', nameKh: 'បន្ទាយមានជ័យ' },
  { name: 'Battambang', nameKh: 'បាត់ដំបង' },
  { name: 'Kampong Cham', nameKh: 'កំពង់ចាម' },
  { name: 'Kampong Chhnang', nameKh: 'កំពង់ឆ្នាំង' },
  { name: 'Kampong Speu', nameKh: 'កំពង់ស្ពឺ' },
  { name: 'Kampong Thom', nameKh: 'កំពង់ធំ' },
  { name: 'Kampot', nameKh: 'កំពត' },
  { name: 'Kandal', nameKh: 'កណ្ដាល' },
  { name: 'Kep', nameKh: 'កែប' },
  { name: 'Koh Kong', nameKh: 'កោះកុង' },
  { name: 'Kratie', nameKh: 'ក្រចេះ' },
  { name: 'Mondul Kiri', nameKh: 'មណ្ឌលគិរី' },
  { name: 'Phnom Penh', nameKh: 'ភ្នំពេញ' },
  { name: 'Pailin', nameKh: 'ប៉ៃលិន' },
  { name: 'Preah Sihanouk', nameKh: 'ព្រះសីហនុ' },
  { name: 'Preah Vihear', nameKh: 'ព្រះវិហារ' },
  { name: 'Prey Veng', nameKh: 'ព្រៃវែង' },
  { name: 'Pursat', nameKh: 'ពោធិ៍សាត់' },
  { name: 'Ratanak Kiri', nameKh: 'រតនគិរី' },
  { name: 'Siem Reap', nameKh: 'សៀមរាប' },
  { name: 'Stung Treng', nameKh: 'ស្ទឹងត្រែង' },
  { name: 'Svay Rieng', nameKh: 'ស្វាយរៀង' },
  { name: 'Takeo', nameKh: 'តាកែវ' },
  { name: 'Tboung Khmum', nameKh: 'ត្បូងឃ្មុំ' },
  { name: 'Oddar Meanchey', nameKh: 'ឧត្តរមានជ័យ' }
];

export const initialInquiries = [
  { id: 'inq-101', type: 'Seller', name: 'Sokha Chan', business: 'Sokha Mart', phone: '+855 12 888 999', telegram: '@sokhamart', province: 'Phnom Penh', status: 'New', date: '2026-04-01', details: 'Interested in stocking L\'affair shower cream and Be Love baby wipes.' },
  { id: 'inq-102', type: 'Partner', name: 'Tan Wei Ming', business: 'Global FMCG Asia Ltd', phone: '+60 12 345 6789', telegram: '@twm_fmcg', province: 'Malaysia / Supplier', status: 'In Progress', date: '2026-03-29', details: 'Looking for exclusive distributor for personal care brand in Cambodia.' },
  { id: 'inq-103', type: 'Product Inquiry', name: 'Rithy Khem', business: 'Phnom Penh Retail', phone: '+855 93 444 555', telegram: '@rithykhem', province: 'Kandal', status: 'Contacted', date: '2026-03-25', details: 'Requesting wholesale price list for BIKA snacks and Tango wafers.' }
];

export const productCategories = [
  'All',
  'Personal Care',
  'Baby Care',
  'Beauty & Body Care',
  'Household Care',
  'Food & Confectionery'
] as const;

export type Brand = typeof initialBrands[number] & { image?: string; flagImage?: string; description_kh?: string; website?: string };
export type Product = typeof initialProducts[number] & { code?: string; image?: string; specs_kh?: string };
export type NewsArticle = typeof initialNews[number] & { image?: string };
export type Inquiry = typeof initialInquiries[number];
