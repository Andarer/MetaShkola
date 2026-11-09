import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

console.log("=== [MetaSchool Smoke Tests] Running automated PWA & Pages diagnostics ===");

const DIST_DIR = path.resolve(process.cwd(), "dist");
assert(fs.existsSync(DIST_DIR), "dist/ directory must exist before running smoke tests");

// 1. Validate dist/index.html
console.log("1. Validating dist/index.html...");
const indexHtmlPath = path.join(DIST_DIR, "index.html");
assert(fs.existsSync(indexHtmlPath), "dist/index.html does not exist");
const indexHtml = fs.readFileSync(indexHtmlPath, "utf-8");

assert(indexHtml.includes('<div id="root"></div>'), "index.html missing #root mounting container");
assert(indexHtml.includes('<link rel="manifest" href="./manifest.json"'), "index.html missing rel=manifest");
assert(indexHtml.includes('<link rel="apple-touch-icon"'), "index.html missing apple-touch-icon");
assert(indexHtml.includes('name="viewport"'), "index.html missing viewport meta");
assert(indexHtml.includes('name="theme-color"'), "index.html missing theme-color meta");
assert(indexHtml.includes('name="mobile-web-app-capable"'), "index.html missing mobile-web-app-capable meta");
assert(indexHtml.includes('name="apple-mobile-web-app-capable"'), "index.html missing apple-mobile-web-app-capable meta");
assert(indexHtml.includes("MetaШкола 2.2"), "index.html title / metadata must specify version 2.2");

// Verify bundled assets from index.html (supports root, relative, or /MetaShkola/ base paths)
const jsMatch = indexHtml.match(/src="([^"]*assets\/[^"]+\.js)"/);
assert(jsMatch, "index.html does not reference bundled JS entrypoint");
const cssMatch = indexHtml.match(/href="([^"]*assets\/[^"]+\.css)"/);
assert(cssMatch, "index.html does not reference bundled CSS stylesheet");

const jsFileName = jsMatch[1].split("assets/").pop();
const cssFileName = cssMatch[1].split("assets/").pop();
assert(jsFileName && fs.existsSync(path.join(DIST_DIR, "assets", jsFileName)), `Bundled JS file assets/${jsFileName} not found in dist/assets`);
assert(cssFileName && fs.existsSync(path.join(DIST_DIR, "assets", cssFileName)), `Bundled CSS file assets/${cssFileName} not found in dist/assets`);
console.log(`   ✓ index.html links to assets/${jsFileName} and assets/${cssFileName}`);

// 2. Validate dist/manifest.json
console.log("2. Validating dist/manifest.json (PWA Standards)...");
const manifestPath = path.join(DIST_DIR, "manifest.json");
assert(fs.existsSync(manifestPath), "dist/manifest.json does not exist");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));

assert.equal(manifest.id, "org.metaschool.pwa", "manifest.json missing required unique id");
assert(manifest.name.includes("MetaШкола"), "manifest.json name mismatch");
assert.equal(manifest.short_name, "MetaШкола", "manifest.json short_name must be ≤ 12 chars");
assert.equal(manifest.display, "standalone", "manifest.json display must be standalone");
assert.equal(manifest.start_url, "./", "manifest.json start_url must be ./");
assert.equal(manifest.scope, "./", "manifest.json scope must be ./");
assert(Array.isArray(manifest.icons) && manifest.icons.length >= 2, "manifest.json must have icons");

// Verify each icon on disk
for (const icon of manifest.icons) {
  const iconRel = icon.src.replace(/^\.?\//, "");
  const iconPath = path.join(DIST_DIR, iconRel);
  assert(fs.existsSync(iconPath), `Icon referenced in manifest (${icon.src}) does not exist at ${iconPath}`);
  const stat = fs.statSync(iconPath);
  assert(stat.size > 0, `Icon ${iconPath} is empty (0 bytes)`);
}
console.log("   ✓ manifest.json and all referenced icon files verified");

// 3. Validate dist/sw.js
console.log("3. Validating dist/sw.js (Service Worker & Cache)...");
const swPath = path.join(DIST_DIR, "sw.js");
assert(fs.existsSync(swPath), "dist/sw.js does not exist");
const swCode = fs.readFileSync(swPath, "utf-8");

assert(swCode.includes('CACHE_NAME = "metaschool-v2.2.0"'), "sw.js cache name must match metaschool-v2.2.0");
assert(swCode.includes("CORE_ASSETS"), "sw.js must define CORE_ASSETS");
assert(swCode.includes("release.json"), "sw.js must include release.json handling");
assert(swCode.includes("clients.claim()"), "sw.js activate must call clients.claim()");
assert(swCode.includes("skipWaiting()"), "sw.js install must call skipWaiting()");
console.log("   ✓ Service Worker syntax and caching configuration verified");

// 4. Validate dist/release.json
console.log("4. Validating dist/release.json (Release Integrity)...");
const releasePath = path.join(DIST_DIR, "release.json");
assert(fs.existsSync(releasePath), "dist/release.json does not exist");
const releaseInfo = JSON.parse(fs.readFileSync(releasePath, "utf-8"));

assert.equal(releaseInfo.version, "2.2.1", "release.json version mismatch");
assert.equal(releaseInfo.versionCode, 221, "release.json versionCode mismatch");
assert.equal(releaseInfo.latestVersion, "2.2.1", "release.json latestVersion mismatch");
assert.equal(releaseInfo.channel, "stable", "release.json channel must be stable");
assert.equal(releaseInfo.pwaUrl, "https://andarer.github.io/MetaShkola/", "release.json pwaUrl mismatch");
assert(
  releaseInfo.apkUrl.includes("MetaSchool-release.apk"),
  "release.json apkUrl must point to official MetaSchool-release.apk"
);
console.log("   ✓ release.json verified: version 2.2.1, stable channel, official release APK link");

// 5. Verify NO Debug APKs or unapproved binaries in dist/
console.log("5. Checking that NO Debug APKs are published inside PWA bundle...");
function scanForApk(dir: string): string[] {
  let found: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      found = found.concat(scanForApk(full));
    } else if (entry.name.endsWith(".apk")) {
      found.push(full);
    }
  }
  return found;
}
const apks = scanForApk(DIST_DIR);
assert.equal(apks.length, 0, `PWA bundle must NOT contain any APK files! Found: ${apks.join(", ")}`);
console.log("   ✓ PWA bundle is clean: zero APK files embedded in static web distribution");

// 6. Live Static Server Simulation (HTTP Request verification)
console.log("6. Simulating live HTTP server requests on built PWA...");

const server = http.createServer((req, res) => {
  const reqUrl = new URL(req.url || "/", "http://127.0.0.1");
  let pathname = decodeURIComponent(reqUrl.pathname);

  // Strip possible GitHub Pages subpath prefix
  if (pathname.startsWith("/MetaShkola/")) {
    pathname = pathname.slice("/MetaShkola".length);
  } else if (pathname === "/MetaShkola") {
    pathname = "/";
  }

  if (pathname === "/") {
    pathname = "/index.html";
  }

  const filePath = path.join(DIST_DIR, pathname);
  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { "Content-Type": "text/plain" });
    res.end("Not Found");
    return;
  }

  const ext = path.extname(filePath);
  const mimeTypes: Record<string, string> = {
    ".html": "text/html",
    ".js": "application/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".png": "image/png",
    ".svg": "image/svg+xml",
  };

  const contentType = mimeTypes[ext] || "application/octet-stream";
  const data = fs.readFileSync(filePath);
  res.writeHead(200, { "Content-Type": contentType });
  res.end(data);
});

async function runHttpChecks(port: number) {
  const endpoints = [
    { path: "/", status: 200, checkBody: (b: string) => b.includes("<div id=\"root\">") },
    { path: "/index.html", status: 200, checkBody: (b: string) => b.includes("MetaШкола 2.2") },
    { path: "/manifest.json", status: 200, checkBody: (b: string) => b.includes("org.metaschool.pwa") },
    { path: "/sw.js", status: 200, checkBody: (b: string) => b.includes("CACHE_NAME") },
    { path: "/release.json", status: 200, checkBody: (b: string) => b.includes("\"version\": \"2.2.1\"") },
    { path: "/favicon.svg", status: 200, checkBody: (b: string) => b.includes("<svg") },
    { path: "/icons/icon-192.png", status: 200, isBinary: true },
    { path: "/icons/icon-512.png", status: 200, isBinary: true },
    { path: "/icons/apple-touch-icon.png", status: 200, isBinary: true },
    // Test with GitHub Pages prefix
    { path: "/MetaShkola/manifest.json", status: 200, checkBody: (b: string) => b.includes("org.metaschool.pwa") },
    { path: "/MetaShkola/release.json", status: 200, checkBody: (b: string) => b.includes("2.2.1") },
  ];

  for (const ep of endpoints) {
    const url = `http://127.0.0.1:${port}${ep.path}`;
    const res = await fetch(url);
    assert.equal(res.status, ep.status, `HTTP GET ${ep.path} returned status ${res.status}`);
    if (ep.isBinary) {
      const buf = Buffer.from(await res.arrayBuffer());
      assert(buf.length > 0, `Binary response for ${ep.path} is empty`);
      // PNG header check
      if (ep.path.endsWith(".png")) {
        assert.equal(buf[0], 0x89);
        assert.equal(buf[1], 0x50);
        assert.equal(buf[2], 0x4e);
        assert.equal(buf[3], 0x47);
      }
    } else {
      const text = await res.text();
      assert(text.length > 0, `Response for ${ep.path} is empty`);
      if (ep.checkBody) {
        assert(ep.checkBody(text), `Response body assertion failed for ${ep.path}`);
      }
    }
    console.log(`   ✓ GET ${ep.path} -> 200 OK (${res.headers.get("content-type")})`);
  }
}

server.listen(0, "127.0.0.1", async () => {
  const address = server.address();
  assert(address && typeof address === "object");
  const port = address.port;
  try {
    await runHttpChecks(port);
    console.log("\n=== [MetaSchool Smoke Tests] ALL 6 CHECKS PASSED SUCCESSFULLY! ===");
    server.close(() => process.exit(0));
  } catch (err) {
    console.error("\n❌ [MetaSchool Smoke Tests] FAILED:", err);
    server.close(() => process.exit(1));
  }
});
