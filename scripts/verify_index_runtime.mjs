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

console.log("OK: index.html JSX compiles and exposes 84 unique products at runtime.");
