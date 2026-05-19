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
globalThis.__hasProductCatalogCards = typeof ProductCatalogCards === "function";
globalThis.__hasProductCard = typeof ProductCard === "function";
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

if (!runtimeContext.__hasProductCatalogCards || !runtimeContext.__hasProductCard || !runtimeContext.__hasProductImage) {
  throw new Error("Expected Phase 2A catalog card components to be defined at runtime.");
}

console.log("OK: index.html JSX compiles and exposes 84 unique products plus enriched catalog metadata at runtime.");
