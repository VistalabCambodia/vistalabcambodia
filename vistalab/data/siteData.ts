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
  { id: 'b12', name: "BIKA", category: "Food & Confectionery", origin: "Malaysia", description: "Iconic savory corn snacks and seafood-flavored crisps.", featured: true, logoText: "BIKA" },
  { id: 'b13', name: "NATA", category: "Food & Confectionery", origin: "Malaysia", description: "Sandwich biscuits with creamy strawberry, butter, and blueberry flavors.", description_kh: "នំប៊ីស្គីតសាំងវិចមានរសជាតិក្រែមស្ត្របឺរី ប៊ឺ និងប្លូបឺរី។", featured: false, logoText: "NATA" },
  { id: 'b14', name: "Danish Style Cookies", category: "Food & Confectionery", origin: "Malaysia", description: "Premium Danish-style butter cookies in classic, chocolate chip, and blueberry varieties.", description_kh: "នំប៊ឺគុណភាពខ្ពស់បែបដាណឺម៉ាក មានរសជាតិបុរាណ សូកូឡាឈីប និងប្លូបឺរី។", featured: false, logoText: "DANISH" }
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

// User supplied biscuit products. These are merged into both the local and Supabase catalogs by product code.
export const suppliedProducts: Product[] = [
  { id: 'nata-005263', code: '005263', name_en: 'NATA Sandwich Biscuits - Strawberry Flavor', name_kh: 'នំប៊ីស្គីតសាំងវិច NATA រសជាតិស្ត្របឺរី (៩ កញ្ចប់)', brand: 'NATA', category: 'Food & Confectionery', origin: 'Malaysia', sizes: '9 individually foil-wrapped packs', specs: 'Flavor: Sweet, fruity strawberry cream with a crispy golden-baked biscuit.\nDescription: Crunchy biscuit layers and smooth fruit-flavored cream, made with inspected wheat flour and quality ingredients.\nCertifications: Halal certified; ISO quality management systems compliant (as supplied).\nStorage: Store in a cool, dry place away from sunlight. Eat promptly after opening.\nNet weight: 9 individual inner packs.\nPackaging: Outer pack with 9 foil-sealed portions.', specs_kh: 'រសជាតិ៖ ក្រែមស្ត្របឺរីផ្អែម ក្រអូប ជាមួយនំប៊ីស្គីតដុតស្រួយពណ៌មាស។\nពិពណ៌នា៖ ស្រទាប់នំប៊ីស្គីតស្រួយ និងក្រែមផ្លែឈើរលោង ផលិតពីម្សៅស្រូវសាលីដែលបានត្រួតពិនិត្យ និងគ្រឿងផ្សំមានគុណភាព។\nវិញ្ញាបនបត្រ៖ ហាឡាល់ និងអនុលោមតាមប្រព័ន្ធគ្រប់គ្រងគុណភាព ISO (តាមព័ត៌មានដែលបានផ្តល់)។\nការរក្សាទុក៖ ទុកនៅកន្លែងត្រជាក់ ស្ងួត និងឆ្ងាយពីពន្លឺថ្ងៃ។ បរិភោគឱ្យបានឆាប់បន្ទាប់ពីបើក។\nបរិមាណ៖ កញ្ចប់តូចចំនួន ៩។\nការវេចខ្ចប់៖ កញ្ចប់ក្រៅមានកញ្ចប់រុំអាលុយមីញ៉ូមបិទជិតចំនួន ៩។', featured: false, imageBg: 'bg-pink-100', imageBadge: 'NATA Biscuits' },
  { id: 'nata-005270', code: '005270', name_en: 'NATA Sandwich Biscuits - Butter / Original Flavor', name_kh: 'នំប៊ីស្គីតសាំងវិច NATA រសជាតិប៊ឺ / ដើម (៩ កញ្ចប់)', brand: 'NATA', category: 'Food & Confectionery', origin: 'Malaysia', sizes: '9 individually foil-wrapped packs', specs: 'Flavor: Rich, smooth butter cream inside a classic crispy biscuit.\nDescription: Golden, crunchy biscuits with a velvety butter-cream center, suitable for lunchboxes, breaks, or tea time.\nCertifications: Halal certified; GMP standards (as supplied).\nStorage: Keep sealed in a cool, dry place.\nNet weight: 9 individual inner packs.\nPackaging: Multi-pack with 9 individual foil wraps.', specs_kh: 'រសជាតិ៖ ក្រែមប៊ឺឈ្ងុយឆ្ងាញ់ និងរលោង នៅក្នុងនំប៊ីស្គីតបុរាណស្រួយ។\nពិពណ៌នា៖ នំប៊ីស្គីតពណ៌មាសស្រួយ មានស្នូលក្រែមប៊ឺទន់រលោង សាកសមសម្រាប់អាហារសម្រន់ ឬញ៉ាំជាមួយតែ។\nវិញ្ញាបនបត្រ៖ ហាឡាល់ និងស្តង់ដារ GMP (តាមព័ត៌មានដែលបានផ្តល់)។\nការរក្សាទុក៖ បិទកញ្ចប់ឱ្យជិត ហើយទុកនៅកន្លែងត្រជាក់ និងស្ងួត។\nបរិមាណ៖ កញ្ចប់តូចចំនួន ៩។\nការវេចខ្ចប់៖ កញ្ចប់ចម្រុះមានកញ្ចប់រុំដោយឡែកចំនួន ៩។', featured: false, imageBg: 'bg-amber-100', imageBadge: 'NATA Biscuits' },
  { id: 'nata-005256', code: '005256', name_en: 'NATA Sandwich Biscuits - Blueberry Flavor', name_kh: 'នំប៊ីស្គីតសាំងវិច NATA រសជាតិប្លូបឺរី (៩ កញ្ចប់)', brand: 'NATA', category: 'Food & Confectionery', origin: 'Malaysia', sizes: '9 individually wrapped packs', specs: 'Flavor: Sweet-tart blueberry cream in a light, crispy biscuit.\nDescription: Berry-flavored sandwich biscuits in protective inner foil packaging to help preserve crispness and freshness.\nCertifications: Halal certified; HACCP food safety standards (as supplied).\nStorage: Store away from heat and humidity.\nNet weight: 9 individual inner packs.\nPackaging: Outer bag with 9 individually wrapped biscuits.', specs_kh: 'រសជាតិ៖ ក្រែមប្លូបឺរីផ្អែមលាយជូរបន្តិច នៅក្នុងនំប៊ីស្គីតស្រាល និងស្រួយ។\nពិពណ៌នា៖ នំប៊ីស្គីតសាំងវិចរសជាតិផ្លែប៊ឺរី វេចខ្ចប់កញ្ចប់ខាងក្នុងដើម្បីជួយរក្សាភាពស្រួយ និងស្រស់។\nវិញ្ញាបនបត្រ៖ ហាឡាល់ និងស្តង់ដារសុវត្ថិភាពអាហារ HACCP (តាមព័ត៌មានដែលបានផ្តល់)។\nការរក្សាទុក៖ ទុកឱ្យឆ្ងាយពីកម្ដៅ និងសំណើម។\nបរិមាណ៖ កញ្ចប់តូចចំនួន ៩។\nការវេចខ្ចប់៖ កញ្ចប់ក្រៅមាននំប៊ីស្គីតរុំដោយឡែកចំនួន ៩។', featured: false, imageBg: 'bg-blue-100', imageBadge: 'NATA Biscuits' },
  { id: 'danish-620263', code: '620263', name_en: 'Traditional Danish Recipe Butter Cookies', name_kh: 'នំប៊ឺរូបមន្តបុរាណបែបដាណឺម៉ាក', brand: 'Danish Style Cookies', category: 'Food & Confectionery', origin: 'Malaysia', sizes: 'Retail box; net weight shown on side panel', specs: 'Flavor: Rich, buttery cookies with a hint of natural vanilla.\nDescription: Traditional-style cookies made with butter and quality ingredients, packed in a presentation box to help preserve freshness.\nCertifications: Halal certified; premium selection quality (as supplied).\nStorage: Store in a cool, dry place. Seal tightly after opening.\nPackaging: Dark blue cardboard display box with an inner protective tray.', specs_kh: 'រសជាតិ៖ នំប៊ឺឈ្ងុយសម្បូរបែប រលាយក្នុងមាត់ និងមានក្លិនវ៉ានីឡាបន្តិច។\nពិពណ៌នា៖ នំប៊ឺបែបបុរាណផលិតពីប៊ឺ និងគ្រឿងផ្សំមានគុណភាព វេចខ្ចប់ក្នុងប្រអប់ដើម្បីជួយរក្សាភាពស្រស់។\nវិញ្ញាបនបត្រ៖ ហាឡាល់ និងគុណភាពជម្រើសពិសេស (តាមព័ត៌មានដែលបានផ្តល់)។\nការរក្សាទុក៖ ទុកនៅកន្លែងត្រជាក់ និងស្ងួត។ បិទឱ្យជិតបន្ទាប់ពីបើក។\nការវេចខ្ចប់៖ ប្រអប់ក្រដាសកាតុងពណ៌ខៀវចាស់ មានថាសការពារខាងក្នុង។', featured: false, imageBg: 'bg-sky-100', imageBadge: 'Butter Cookies' },
  { id: 'danish-620287', code: '620287', name_en: 'Danish Style Chocolate Chip Butter Cookies', name_kh: 'នំប៊ឺបែបដាណឺម៉ាករសជាតិសូកូឡាឈីប', brand: 'Danish Style Cookies', category: 'Food & Confectionery', origin: 'Malaysia', sizes: 'Retail box; net weight shown on side panel', specs: 'Flavor: Creamy butter-cookie base with rich, sweet chocolate chips.\nDescription: Butter cookies with chocolate chips in sturdy packaging designed to protect the cookies and aroma.\nCertifications: Halal certified; international safe food manufacturing compliant (as supplied).\nStorage: Keep away from humidity and high temperatures.\nPackaging: Brown cardboard box with interior protective lining.', specs_kh: 'រសជាតិ៖ នំប៊ឺទន់រលោង លាយជាមួយគ្រាប់សូកូឡាផ្អែមឈ្ងុយ។\nពិពណ៌នា៖ នំប៊ឺលាយសូកូឡាឈីប វេចខ្ចប់ក្នុងប្រអប់រឹងមាំដើម្បីការពារនំ និងក្លិនឈ្ងុយ។\nវិញ្ញាបនបត្រ៖ ហាឡាល់ និងអនុលោមតាមការផលិតអាហារប្រកបដោយសុវត្ថិភាពអន្តរជាតិ (តាមព័ត៌មានដែលបានផ្តល់)។\nការរក្សាទុក៖ ទុកឱ្យឆ្ងាយពីសំណើម និងកម្ដៅខ្លាំង។\nការវេចខ្ចប់៖ ប្រអប់ក្រដាសពណ៌ត្នោត មានស្រទាប់ការពារខាងក្នុង។', featured: false, imageBg: 'bg-amber-100', imageBadge: 'Chocolate Chip Cookies' },
  { id: 'danish-620300', code: '620300', name_en: 'Danish Style Blueberry Butter Cookies', name_kh: 'នំប៊ឺបែបដាណឺម៉ាករសជាតិប្លូបឺរី', brand: 'Danish Style Cookies', category: 'Food & Confectionery', origin: 'Malaysia', sizes: 'Retail box; net weight shown on side panel', specs: 'Flavor: Buttery cookies with sweet blueberry fruit notes.\nDescription: Danish-style butter cookies with blueberry flavor, made and packed under verified hygiene and food safety practices.\nCertifications: Halal certified; verified factory hygiene standards (as supplied).\nStorage: Store in a cool place. Close the container tightly after opening.\nPackaging: Light blue cardboard box with an inner protective tray.', specs_kh: 'រសជាតិ៖ នំប៊ឺឈ្ងុយឆ្ងាញ់ លាយជាមួយក្លិន និងរសជាតិផ្លែប្លូបឺរីផ្អែម។\nពិពណ៌នា៖ នំប៊ឺបែបដាណឺម៉ាករសជាតិប្លូបឺរី ផលិត និងវេចខ្ចប់តាមការអនុវត្តអនាម័យ និងសុវត្ថិភាពអាហារ។\nវិញ្ញាបនបត្រ៖ ហាឡាល់ និងស្តង់ដារអនាម័យរោងចក្រដែលបានផ្ទៀងផ្ទាត់ (តាមព័ត៌មានដែលបានផ្តល់)។\nការរក្សាទុក៖ ទុកនៅកន្លែងត្រជាក់។ បិទធុងឱ្យជិតបន្ទាប់ពីបើក។\nការវេចខ្ចប់៖ ប្រអប់ក្រដាសពណ៌ខៀវស្រាល មានថាសការពារខាងក្នុង។', featured: false, imageBg: 'bg-blue-100', imageBadge: 'Blueberry Cookies' }
];
