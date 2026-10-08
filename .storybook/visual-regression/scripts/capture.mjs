// Screenshots every story of a static Storybook build with one headless Chrome.
//
//   node capture.mjs <storybook-static dir> <output dir> [options]
//
//   --theme dark|light   colour theme (default dark)
//   --filter text        only stories whose id contains the text
//   --ids file           only the story ids listed in the file, one per line
//   --concurrency n      parallel pages (default: CPU count, or CAPTURE_CONCURRENCY)
//
// The output directory is not cleared, so a cache of earlier shots can be
// topped up; shots of a story are overwritten when it is captured again.
//
// Extra shots come from story tags:
//   capture-hover  real pointer hover over [data-capture] (or the first button/link)
//   capture-focus  keyboard focus on the same element (Tab focus, so :focus-visible applies)
//   cloud          render with the NetBird Cloud config instead of self-hosted
// Open menus, dialogs and other interactive states are separate stories with a
// `play` function; the shot is taken after the play function has finished.
// The clock is frozen so relative times ("3 days ago") never change.
import * as fs from "node:fs";
import * as http from "node:http";
import * as os from "node:os";
import * as path from "node:path";
import puppeteer from "puppeteer-core";

const [dir, out, ...rest] = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = rest.indexOf(`--${name}`);
  return i === -1 ? fallback : rest[i + 1];
};
const theme = flag("theme", "dark");
const filter = flag("filter", "");
const idsFile = flag("ids", "");
// Rendering is CPU bound, so one page per core; CI runners get fewer pages
// automatically.
const concurrency = Number(
  flag("concurrency", process.env.CAPTURE_CONCURRENCY ?? os.availableParallelism()),
);
const chrome =
  process.env.CHROME_PATH ??
  (process.platform === "darwin"
    ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
    : "/usr/bin/google-chrome");

if (!dir || !out) {
  console.error(
    "usage: capture.mjs <storybook-static dir> <output dir> [--theme dark|light] [--filter text] [--ids file] [--concurrency n]",
  );
  process.exit(1);
}

const server = await serve(dir);
const base = `http://127.0.0.1:${server.address().port}`;
const index = JSON.parse(
  fs.readFileSync(path.join(dir, "index.json"), "utf-8"),
);
const only = idsFile
  ? new Set(fs.readFileSync(idsFile, "utf-8").split("\n").filter(Boolean))
  : null;
const stories = Object.values(index.entries).filter(
  (e) => e.type === "story" && e.id.includes(filter) && (!only || only.has(e.id)),
);

fs.mkdirSync(out, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: chrome,
  headless: true,
  // Stories render in parallel tabs; without these, Chrome throttles the
  // background ones and their rendering stalls.
  args: [
    "--font-render-hinting=none",
    "--hide-scrollbars",
    "--disable-background-timer-throttling",
    "--disable-renderer-backgrounding",
    "--disable-backgrounding-occluded-windows",
    // Ubuntu 24.04 runners restrict the user namespaces Chrome's sandbox
    // needs; CI machines are throwaway, so the sandbox is skipped there.
    ...(process.env.CI ? ["--no-sandbox"] : []),
  ],
});

const started = Date.now();
let failed = 0;
const unmocked = new Set();
const NOW = Date.parse("2026-10-08T12:00:00Z");
const queue = [...stories];
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    // A context per worker gives each page its own window, so none of them is a
    // hidden background tab (hover and focus never complete in those).
    const page = await (await browser.createBrowserContext()).newPage();
    await page.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
    await page.emulateMediaFeatures([
      { name: "prefers-reduced-motion", value: "reduce" },
    ]);
    await page.emulateTimezone("UTC");
    // The clock starts at NOW and keeps ticking: relative times stay stable,
    // while lodash debounce (which compares Date.now() deltas) still fires.
    await page.evaluateOnNewDocument((now) => {
      const RealDate = Date;
      const start = performance.now();
      const current = () => now + (performance.now() - start);
      // eslint-disable-next-line no-global-assign
      Date = class extends RealDate {
        constructor(...args) {
          super(...(args.length ? args : [current()]));
        }
        static now() {
          return current();
        }
      };
    }, NOW);
    // A throwing play function still ends in the "finished" phase, so
    // failures are picked up from the preview channel instead.
    await page.evaluateOnNewDocument(() => {
      const watch = setInterval(() => {
        const channel = window.__STORYBOOK_ADDONS_CHANNEL__;
        if (!channel) return;
        clearInterval(watch);
        for (const event of [
          "playFunctionThrewException",
          "storyThrewException",
          "storyErrored",
        ]) {
          channel.on(event, (error) => {
            window.__captureError = error?.message ?? error?.title ?? event;
          });
        }
      }, 5);
    });
    page.on("console", (message) => {
      const match = message.text().match(/^\[storybook api\] unmocked (.+)$/);
      if (match) unmocked.add(match[1]);
    });
    for (let story = queue.shift(); story; story = queue.shift()) {
      try {
        await shoot(page, story);
      } catch (error) {
        failed++;
        console.error(`✗ ${story.id}: ${error.message}`);
      }
    }
  }),
);

await browser.close();
if (unmocked.size)
  console.log(
    `unmocked API calls (answered with an empty list):\n  ${[...unmocked]
      .sort()
      .join("\n  ")}`,
  );
server.close();
console.log(
  `${stories.length} stories → ${out} in ${(
    (Date.now() - started) /
    1000
  ).toFixed(1)}s` + (failed ? `, ${failed} failed` : ""),
);
process.exit(failed ? 1 : 0);

async function shoot(page, story) {
  const flavor = story.tags?.includes("cloud") ? "cloud" : "selfhosted";
  const url = `${base}/iframe.html?id=${story.id}&viewMode=story&globals=theme:${theme};flavor:${flavor}`;
  // API calls are mocked in-page, so there is no network to wait for;
  // waitForStory below waits for the render and play function instead.
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await waitForStory(page);
  await freezeMotion(page);
  // Radix focuses the dialog container itself when it has nothing focusable,
  // and whether Chrome then draws a focus ring depends on its input-modality
  // heuristic, which varies from run to run. Containers lose focus; inputs and
  // buttons keep it.
  await page.evaluate(() => {
    const el = document.activeElement;
    if (el instanceof HTMLElement && el.matches('[role="dialog"], [role="alertdialog"], [tabindex="-1"]')) el.blur();
  });
  await page.screenshot({
    path: path.join(out, `${story.id}.png`),
    fullPage: true,
  });

  const target =
    (await page.$("[data-capture]")) ??
    (await page.$(
      "#storybook-root button, #storybook-root a, #storybook-root input",
    ));
  if (!target) return;
  if (story.tags?.includes("capture-hover")) {
    await target.hover();
    await settle(page);
    await page.screenshot({
      path: path.join(out, `${story.id}--hover.png`),
      fullPage: true,
    });
    await page.mouse.move(0, 0);
  }
  if (story.tags?.includes("capture-focus")) {
    // Focus the element before the target, then Tab, so the browser treats it as keyboard focus.
    await target.evaluate((el) => {
      const anchor = document.createElement("button");
      anchor.style.cssText = "position:fixed;opacity:0;pointer-events:none";
      el.before(anchor);
      anchor.focus();
    });
    await page.keyboard.press("Tab");
    await settle(page);
    await page.screenshot({
      path: path.join(out, `${story.id}--focus.png`),
      fullPage: true,
    });
  }
}

/* Waits for Storybook to finish rendering and running the play function. */
async function waitForStory(page) {
  await page.waitForFunction(
    () => {
      const render = window.__STORYBOOK_PREVIEW__?.currentRender;
      return (
        render &&
        ["finished", "completed", "errored", "aborted", "playErrored"].includes(
          render.phase,
        )
      );
    },
    { timeout: 15_000, polling: 100 },
  );
  const { phase, error } = await page.evaluate(() => ({
    phase: window.__STORYBOOK_PREVIEW__.currentRender.phase,
    error: window.__captureError,
  }));
  if (error) throw new Error(`play/render error: ${error}`);
  if (!["finished", "completed"].includes(phase))
    throw new Error(`story ${phase}`);
  await settle(page);
}

async function settle(page) {
  await page.evaluate(() => document.fonts.ready);
  await new Promise((r) => setTimeout(r, 150));
}

/* Radix and framer-motion animate opening states; finish every running animation. */
async function freezeMotion(page) {
  await page.addStyleTag({
    content:
      "*,*::before,*::after{transition:none!important;animation-duration:0s!important;animation-delay:0s!important;caret-color:transparent!important}" +
      // The skeleton shimmer is a moving gradient that never lands on the same frame twice.
      ".react-loading-skeleton::after{display:none!important}",
  });
  await page.evaluate(() => {
    document.getAnimations().forEach((a) => a.finish?.());
    // SMIL spinners (<animate> inside SVGs) ignore CSS; stop them on their first frame.
    document.querySelectorAll("svg").forEach((svg) => {
      svg.pauseAnimations?.();
      svg.setCurrentTime?.(0);
    });
  });
}

function serve(root) {
  const types = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".ttf": "font/ttf",
    ".woff2": "font/woff2",
  };
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const file = path.join(
        root,
        decodeURIComponent(new URL(req.url, "http://x").pathname),
      );
      fs.readFile(
        fs.existsSync(file) && fs.statSync(file).isDirectory()
          ? path.join(file, "index.html")
          : file,
        (err, data) => {
          if (err) return res.writeHead(404).end();
          res
            .writeHead(200, {
              "content-type":
                types[path.extname(file)] ?? "application/octet-stream",
            })
            .end(data);
        },
      );
    });
    server.listen(0, "127.0.0.1", () => resolve(server));
  });
}
