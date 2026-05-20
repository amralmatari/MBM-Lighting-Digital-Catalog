import fs from "node:fs/promises";
import vm from "node:vm";

const html = await fs.readFile("index.html", "utf8");
const match = html.match(/<script type="text\/babel">([\s\S]*?)<\/script>/);

if (!match) {
  throw new Error("Could not find the text/babel script in index.html");
}

const script = `${match[1]}
globalThis.__productCount = mbmProducts.length;
globalThis.__productNumbers = mbmProducts.map((product) => product.item_number);
globalThis.__catalogCount = catalogProducts.length;
globalThis.__catalogProducts = catalogProducts;
globalThis.__catalogFamilyCount = catalogFamilies.length;
globalThis.__catalogFamilies = catalogFamilies;
globalThis.__catalogCategoryCardCount = catalogCategoryCards.length;
globalThis.__catalogCategoryCards = catalogCategoryCards;
globalThis.__hasProductCategoryCards = typeof ProductCategoryCards === "function";
globalThis.__hasProductCategoryCard = typeof ProductCategoryCard === "function";
globalThis.__hasCategoryDetailsModal = typeof CategoryDetailsModal === "function";
globalThis.__hasCategoryVariantTable = typeof CategoryVariantTable === "function";
globalThis.__hasProductImage = typeof ProductImage === "function";
`;

const babelSource = await fetch("https://unpkg.com/@babel/standalone/babel.min.js").then((response) => {
  if (!response.ok) {
    throw new Error(`Failed to load Babel standalone: ${response.status}`);
  }
  return response.text();
});

const babelContext = { console };
babelContext.window = babelContext;
babelContext.self = babelContext;
babelContext.globalThis = babelContext;
vm.createContext(babelContext);
vm.runInContext(babelSource, babelContext);

const transformed = babelContext.Babel.transform(script, {
  presets: ["react"],
}).code;

const runtimeContext = {
  console,
  document: {
    getElementById: () => ({}),
  },
  React: {
    createElement: (type, props, ...children) => ({ type, props, children }),
    useState: (initialValue) => [initialValue, () => {}],
    useEffect: () => {},
  },
  ReactDOM: {
    createRoot: () => ({
      render: () => {},
    }),
  },
};
runtimeContext.window = runtimeContext;
runtimeContext.self = runtimeContext;
runtimeContext.globalThis = runtimeContext;
vm.createContext(runtimeContext);
vm.runInContext(transformed, runtimeContext);

if (runtimeContext.__productCount !== 84) {
  throw new Error(`Expected 84 products at runtime, got ${runtimeContext.__productCount}`);
}

const uniqueCount = new Set(runtimeContext.__productNumbers).size;
if (uniqueCount !== 84) {
  throw new Error(`Expected 84 unique product item numbers, got ${uniqueCount}`);
}

if (runtimeContext.__catalogCount !== runtimeContext.__productCount) {
  throw new Error(`Expected catalogProducts to contain ${runtimeContext.__productCount} products, got ${runtimeContext.__catalogCount}`);
}

const requiredCatalogFields = [
  "display_name",
  "short_name",
  "catalog_category",
  "product_type",
  "product_image",
  "application_image",
  "image_status",
  "recommended_use",
  "badges",
  "is_lighting_unit",
  "is_accessory",
  "is_driver",
  "is_track",
  "has_valid_lumen",
  "is_calculator_ready",
  "catalog_notes",
];

for (const product of runtimeContext.__catalogProducts) {
  const missing = requiredCatalogFields.filter((field) => !(field in product));
  if (missing.length > 0) {
    throw new Error(`Catalog product ${product.item_number} is missing fields: ${missing.join(", ")}`);
  }
}

const calculatorReadyCount = runtimeContext.__catalogProducts.filter((product) => product.is_calculator_ready).length;
if (calculatorReadyCount !== 27) {
  throw new Error(`Expected 27 calculator-ready products, got ${calculatorReadyCount}`);
}

const missingLumenCount = runtimeContext.__catalogProducts.filter((product) => !product.has_valid_lumen).length;
if (missingLumenCount !== 57) {
  throw new Error(`Expected 57 products missing lumen, got ${missingLumenCount}`);
}

const invalidLumenReady = runtimeContext.__catalogProducts.filter((product) => product.lumen === "-" && product.is_calculator_ready);
if (invalidLumenReady.length > 0) {
  throw new Error(`Products with missing lumen should not be calculator-ready: ${invalidLumenReady.map((product) => product.item_number).join(", ")}`);
}

const nonLightingTypes = new Set(["driver", "magnetic_track", "connector", "mounting_accessory", "cable", "accessory", "unknown"]);
const nonLightingFlagged = runtimeContext.__catalogProducts.filter((product) => nonLightingTypes.has(product.product_type) && product.is_lighting_unit);
if (nonLightingFlagged.length > 0) {
  throw new Error(`Non-lighting product types should not be lighting units: ${nonLightingFlagged.map((product) => `${product.item_number}:${product.product_type}`).join(", ")}`);
}

const byItemNumber = new Map(runtimeContext.__catalogProducts.map((product) => [product.item_number, product]));
const cupProduct = byItemNumber.get("07-001-14-001");
if (!cupProduct || cupProduct.product_type !== "cup_light" || cupProduct.display_name !== "كوب لايت CY107 - 7 وات - 6500K" || cupProduct.short_name !== "كوب لايت 7 وات" || cupProduct.is_calculator_ready !== true) {
  throw new Error("Catalog enrichment for 07-001-14-001 does not match expected cup light metadata.");
}

const driverProduct = byItemNumber.get("07-001-18-015");
if (!driverProduct || driverProduct.product_type !== "driver" || driverProduct.is_lighting_unit !== false) {
  throw new Error("Catalog enrichment for 07-001-18-015 should classify it as a non-lighting driver.");
}

const trackProduct = byItemNumber.get("07-001-18-001");
if (!trackProduct || trackProduct.product_type !== "magnetic_track" || trackProduct.is_lighting_unit !== false) {
  throw new Error("Catalog enrichment for 07-001-18-001 should classify it as a non-lighting magnetic track.");
}

const splitLumenProduct = byItemNumber.get("07-001-15-004");
if (!splitLumenProduct || splitLumenProduct.lumen_value !== 2600) {
  throw new Error(`Expected 07-001-15-004 lumen_value to be 2600, got ${splitLumenProduct?.lumen_value}`);
}

if (!runtimeContext.__hasProductCategoryCards || !runtimeContext.__hasProductCategoryCard || !runtimeContext.__hasProductImage) {
  throw new Error("Expected Phase 2A-Fix-2 category card components to be defined at runtime.");
}

if (!runtimeContext.__hasCategoryDetailsModal || !runtimeContext.__hasCategoryVariantTable) {
  throw new Error("Expected Phase 2B category details modal components to be defined at runtime.");
}

if (!runtimeContext.__catalogFamilyCount || runtimeContext.__catalogFamilyCount >= runtimeContext.__catalogCount) {
  throw new Error(`Expected catalogFamilies to group SKUs into fewer families than products, got ${runtimeContext.__catalogFamilyCount} families for ${runtimeContext.__catalogCount} products.`);
}

const familyById = new Map(runtimeContext.__catalogFamilies.map((family) => [family.family_id, family]));
const cy107Family = [...runtimeContext.__catalogFamilies].find((family) => family.product_type === "cup_light" && family.model === "CY107");
if (!cy107Family) {
  throw new Error("Expected a CY107 cup_light family.");
}
if (cy107Family.variant_count !== 3) {
  throw new Error(`Expected CY107 family to contain 3 variants, got ${cy107Family.variant_count}`);
}
if (cy107Family.family_name !== "كوب لايت CY107") {
  throw new Error(`Expected CY107 family name to be كوب لايت CY107, got ${cy107Family.family_name}`);
}
if (JSON.stringify(cy107Family.available_watts) !== JSON.stringify([7])) {
  throw new Error(`Expected CY107 watts [7], got ${JSON.stringify(cy107Family.available_watts)}`);
}
if (JSON.stringify(cy107Family.available_kelvins) !== JSON.stringify(["3000K", "4000K", "6500K"])) {
  throw new Error(`Expected CY107 kelvins [3000K,4000K,6500K], got ${JSON.stringify(cy107Family.available_kelvins)}`);
}
if (cy107Family.badges.includes("مناسب للحاسبة") || cy107Family.badges.includes("لومن متوفر")) {
  throw new Error("Family card badges should not include calculator/internal lumen badges.");
}

const cy107VariantNumbers = new Set(cy107Family.variants.map((product) => product.item_number));
for (const itemNumber of ["07-001-14-001", "07-001-14-002", "07-001-14-003"]) {
  if (!cy107VariantNumbers.has(itemNumber)) {
    throw new Error(`CY107 family is missing variant ${itemNumber}`);
  }
}

if (familyById.size !== runtimeContext.__catalogFamilyCount) {
  throw new Error("Expected catalog family IDs to be unique.");
}

if (!runtimeContext.__catalogCategoryCardCount || runtimeContext.__catalogCategoryCardCount >= runtimeContext.__catalogCount) {
  throw new Error(`Expected catalogCategoryCards to group SKUs into fewer category cards than products, got ${runtimeContext.__catalogCategoryCardCount} cards for ${runtimeContext.__catalogCount} products.`);
}

const categoryCardById = new Map(runtimeContext.__catalogCategoryCards.map((card) => [card.card_id, card]));
const cupCategoryCard = categoryCardById.get("lighting::07-001-14");
if (!cupCategoryCard) {
  throw new Error("Expected a category card for lighting::07-001-14.");
}
if (cupCategoryCard.display_title !== "قواعد إضاءة كوب") {
  throw new Error(`Expected cup category display title قواعد إضاءة كوب, got ${cupCategoryCard.display_title}`);
}
if (cupCategoryCard.variant_count !== 15) {
  throw new Error(`Expected cup category to contain 15 SKUs, got ${cupCategoryCard.variant_count}`);
}
if (cupCategoryCard.model_count !== 5) {
  throw new Error(`Expected cup category to contain 5 models, got ${cupCategoryCard.model_count}`);
}
if (JSON.stringify(cupCategoryCard.available_watts) !== JSON.stringify([7, 12, 20, 30, 40])) {
  throw new Error(`Expected cup category watts [7,12,20,30,40], got ${JSON.stringify(cupCategoryCard.available_watts)}`);
}
if (JSON.stringify(cupCategoryCard.available_kelvins) !== JSON.stringify(["3000K", "4000K", "6500K"])) {
  throw new Error(`Expected cup category kelvins [3000K,4000K,6500K], got ${JSON.stringify(cupCategoryCard.available_kelvins)}`);
}
for (const model of ["CY107", "CY112", "CY120"]) {
  const modelCard = runtimeContext.__catalogCategoryCards.find((card) => card.display_title.includes(model));
  if (modelCard) {
    throw new Error(`Model ${model} should not appear as a top-level category card.`);
  }
}
for (const accessoryCardId of ["system::drivers", "system::tracks", "system::connectors"]) {
  if (!categoryCardById.has(accessoryCardId)) {
    throw new Error(`Expected functional accessory card ${accessoryCardId}.`);
  }
}

console.log("OK: index.html JSX compiles and exposes 84 unique products plus enriched catalog metadata at runtime.");
