import { defineConfig } from "vite";
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(fileURLToPath(import.meta.url));

function pageInput() {
  const input = { main: resolve(root, "index.html") };
  const extras = {
    offers: "offers/index.html",
    quote: "quote/index.html",
    field: "field/index.html",
    admin: "admin/index.html",
  };
  for (const [name, rel] of Object.entries(extras)) {
    const abs = resolve(root, rel);
    if (existsSync(abs)) input[name] = abs;
  }
  return input;
}

function copyIfExists(fromRel, toRel) {
  const from = resolve(root, fromRel);
  if (!existsSync(from)) return;
  const to = resolve(root, toRel);
  mkdirSync(dirname(to), { recursive: true });
  cpSync(from, to, { recursive: true });
}

function copyDirByExt(fromRel, toRel, exts) {
  const from = resolve(root, fromRel);
  if (!existsSync(from)) return;
  mkdirSync(resolve(root, toRel), { recursive: true });
  for (const name of readdirSync(from)) {
    if (exts.some((ext) => name.endsWith(ext))) {
      cpSync(resolve(from, name), resolve(root, toRel, name));
    }
  }
}

function copyClassicScripts() {
  copyIfExists("shared", "dist/shared");
  copyIfExists("app.js", "dist/app.js");
  copyIfExists("i18n.js", "dist/i18n.js");
  copyDirByExt("assets/mascot", "dist/assets/mascot", [".js", ".svg"]);
  copyDirByExt("offers", "dist/offers", [".js"]);
  copyDirByExt("quote", "dist/quote", [".js"]);
  copyDirByExt("field", "dist/field", [".js"]);
  copyDirByExt("admin", "dist/admin", [".js"]);
}

export default defineConfig({
  root,
  publicDir: false,
  plugins: [
    {
      name: "copy-classic-scripts",
      closeBundle() {
        copyClassicScripts();
      },
    },
  ],
  resolve: {
    alias: {
      "@shared": resolve(root, "shared"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 4173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  preview: {
    host: "0.0.0.0",
    port: 4173,
    proxy: {
      "/api": "http://127.0.0.1:8787",
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      input: pageInput(),
    },
  },
});
