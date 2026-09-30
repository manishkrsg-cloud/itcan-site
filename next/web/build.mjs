// Builds the ITCAN site into ../public.
//   JS:   src/main.js (+ lazy chunks) -> public/js/, src/gate.js -> public/js/gate.js
//   CSS:  css/index.css (@imports) -> public/css/site.css
//   HTML: html/index.html with <!--#include name--> partials -> public/index.html
import * as esbuild from "esbuild";
import { readFileSync, writeFileSync, rmSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const pub = join(here, "..", "public");
const version = new Date().toISOString().replace(/\D/g, "").slice(0, 12);

function html() {
  const read = (n) => readFileSync(join(here, "html", n), "utf8");
  let out = read("index.html");
  for (let i = 0; i < 4; i++) out = out.replace(/<!--#include ([\w-]+)-->/g, (_, n) => read(`${n}.html`));
  out = out.replaceAll("{{v}}", version);
  writeFileSync(join(pub, "index.html"), out);
  writeFileSync(join(pub, "404.html"), read("404.html").replaceAll("{{v}}", version));
}

async function build() {
  rmSync(join(pub, "js"), { recursive: true, force: true });
  mkdirSync(join(pub, "js"), { recursive: true });
  await esbuild.build({
    entryPoints: [join(here, "src", "main.js")],
    bundle: true, format: "esm", splitting: true, minify: true, target: "es2020",
    outdir: join(pub, "js"), chunkNames: "chunks/[name]-[hash]", legalComments: "none",
    logLevel: "warning",
  });
  await esbuild.build({
    entryPoints: [join(here, "src", "gate.js")], bundle: true, format: "iife", minify: true,
    target: "es2018", outfile: join(pub, "js", "gate.js"), logLevel: "warning",
  });
  await esbuild.build({
    entryPoints: [join(here, "css", "index.css")], bundle: true, minify: true,
    outfile: join(pub, "css", "site.css"), external: ["/assets/*"], logLevel: "warning",
    target: ["chrome100", "safari15", "firefox100"],
  });
  html();
  console.log("built", version);
}

await build();
