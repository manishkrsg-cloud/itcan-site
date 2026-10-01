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
  legal(read);
}

// Legal pages: one template, three bodies, served at /<slug>/
const LEGAL = [
  { slug: "terms-of-use", file: "terms", title: "Terms of use", h1: "Terms <em>of use.</em>", desc: "The terms that apply when you use the ITCAN website." },
  { slug: "privacy-policy", file: "privacy", title: "Privacy policy", h1: "Privacy <em>policy.</em>", desc: "How ITCAN Pte Ltd handles personal data in connection with its website, in line with Singapore's PDPA." },
  { slug: "disclaimer", file: "disclaimer", title: "Disclaimer", h1: "Website <em>disclaimer.</em>", desc: "Disclaimer for information published on the ITCAN website." },
];
const UPDATED = "1 October 2026";
function legal(read) {
  const tpl = read("legal.html");
  for (const page of LEGAL) {
    const tabs = LEGAL.map((p) => `<a href="/${p.slug}/"${p === page ? ' aria-current="page"' : ""}>${p.title}</a>`).join("");
    const out = tpl.replaceAll("{{v}}", version).replaceAll("{{title}}", page.title).replaceAll("{{h1}}", page.h1)
      .replaceAll("{{desc}}", page.desc).replaceAll("{{slug}}", page.slug).replaceAll("{{updated}}", UPDATED)
      .replace("{{tabs}}", tabs).replace("{{body}}", read(`legal/${page.file}.html`).trim());
    mkdirSync(join(pub, page.slug), { recursive: true });
    writeFileSync(join(pub, page.slug, "index.html"), out);
  }
  // the legal pages read the saved theme before first paint (no inline scripts under the CSP)
  writeFileSync(join(pub, "js", "theme.js"), 'try{localStorage.getItem("itcan-theme")==="light"&&document.documentElement.setAttribute("data-theme","light")}catch(e){}\n');
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
