/**
 * Manual assertion script for locale detection helpers.
 *
 * Run (matches the project's existing convention — e.g. version.test.ts):
 *   npx tsx src/i18n/detection.test.ts
 *
 * The detection helpers read from `document.cookie` and `window.navigator`,
 * so this script stubs both before each scenario. isBrowser() gates on
 * `typeof window`, so we must stub `window` (not just navigator) to exercise
 * the browser branches.
 */

const globalAny = globalThis as unknown as {
  window?: { navigator: { languages: string[]; language: string } };
  document?: { cookie: string };
};

let failures = 0;
function assert(condition: boolean, message: string) {
  const status = condition ? "✓" : "✗";
  if (!condition) failures++;
  console.log(`  ${status} ${message}`);
}

/**
 * Minimal RFC-6265-ish cookie jar: js-cookie reads `document.cookie` (get)
 * and appends via assignment (set). This models both directions so
 * getCookieLocale/persistLocale behave as in a real browser.
 */
function makeDoc(initialCookie: string) {
  const jar: Record<string, string> = {};
  initialCookie
    .split(";")
    .map((p) => p.trim())
    .filter(Boolean)
    .forEach((pair) => {
      const idx = pair.indexOf("=");
      const k = idx === -1 ? pair : pair.slice(0, idx);
      jar[k] = idx === -1 ? "" : pair.slice(idx + 1);
    });
  const doc = {};
  Object.defineProperty(doc, "cookie", {
    configurable: true,
    get() {
      return Object.entries(jar)
        .map(([k, v]) => `${k}=${v}`)
        .join("; ");
    },
    set(str: string) {
      const first = str.split(";")[0];
      const idx = first.indexOf("=");
      const k = (idx === -1 ? first : first.slice(0, idx)).trim();
      jar[k] = idx === -1 ? "" : first.slice(idx + 1);
    },
  });
  return doc as { cookie: string };
}

async function run() {
  const {
    matchLocale,
    isSupportedLocale,
    getCookieLocale,
    detectBrowserLocale,
    detectLocale,
    persistLocale,
  } = await import("./detection");

  console.log("=== isSupportedLocale ===");
  assert(isSupportedLocale("en"), '"en" is supported');
  assert(isSupportedLocale("zh"), '"zh" is supported');
  assert(!isSupportedLocale("fr"), '"fr" is not supported');
  assert(!isSupportedLocale(undefined), "undefined is not supported");

  console.log("=== matchLocale ===");
  assert(matchLocale("en") === "en", '"en" -> "en"');
  assert(matchLocale("zh") === "zh", '"zh" -> "zh"');
  assert(matchLocale("zh-CN") === "zh", '"zh-CN" -> "zh" (primary subtag)');
  assert(matchLocale("en-US") === "en", '"en-US" -> "en" (primary subtag)');
  assert(matchLocale("EN") === "en", '"EN" -> "en" (case-insensitive)');
  assert(matchLocale("fr-FR") === undefined, '"fr-FR" -> undefined');
  assert(matchLocale(undefined) === undefined, "undefined -> undefined");

  type Env = { languages: string[]; language: string; cookie: string } | null;
  function withEnv(env: Env, fn: () => void) {
    if (env) {
      globalAny.window = {
        navigator: { languages: env.languages, language: env.language },
      };
      globalAny.document = makeDoc(env.cookie);
    } else {
      delete globalAny.window;
      delete globalAny.document;
    }
    fn();
  }

  console.log("=== detectLocale: SSR/build (no window) ===");
  withEnv(null, () => {
    assert(detectLocale() === "en", "no DOM -> default locale (en) [no crash]");
    assert(getCookieLocale() === undefined, "getCookieLocale() safe in SSR");
    assert(
      detectBrowserLocale() === "en",
      "detectBrowserLocale() -> default in SSR",
    );
  });

  console.log("=== detectLocale: cookie wins ===");
  withEnv(
    { languages: ["en-US"], language: "en-US", cookie: "NEXT_LOCALE=zh" },
    () => {
      assert(getCookieLocale() === "zh", "reads NEXT_LOCALE=zh cookie");
      assert(detectLocale() === "zh", "cookie (zh) beats browser (en)");
    },
  );

  console.log("=== detectLocale: browser fallback ===");
  withEnv({ languages: ["en-US", "en"], language: "en-US", cookie: "" }, () => {
    assert(getCookieLocale() === undefined, "no cookie -> undefined");
    assert(detectBrowserLocale() === "en", "navigator -> en");
    assert(detectLocale() === "en", "no cookie -> browser locale (en)");
  });

  console.log("=== detectLocale: navigator.languages first match wins ===");
  withEnv(
    { languages: ["fr-FR", "zh-CN"], language: "fr-FR", cookie: "" },
    () => {
      assert(
        detectBrowserLocale() === "zh",
        'skips unsupported "fr", picks "zh"',
      );
    },
  );

  console.log("=== detectLocale: unsupported everywhere -> default ===");
  withEnv({ languages: ["de-DE"], language: "de-DE", cookie: "" }, () => {
    assert(detectLocale() === "en", "unsupported -> default (en)");
  });

  console.log("=== persistLocale: writes cookie ===");
  withEnv({ languages: ["en"], language: "en", cookie: "" }, () => {
    persistLocale("en");
    assert(
      globalAny.document!.cookie.startsWith("NEXT_LOCALE=en"),
      'persistLocale("en") writes NEXT_LOCALE=en cookie',
    );
    assert(
      getCookieLocale() === "en",
      "written cookie is immediately readable",
    );
  });

  console.log("=== persistLocale: SSR no-op ===");
  withEnv(null, () => {
    let threw = false;
    try {
      persistLocale("en");
    } catch {
      threw = true;
    }
    assert(!threw, "persistLocale is a no-op (no throw) without DOM");
  });

  console.log();
  if (failures === 0) {
    console.log("All locale detection checks passed ✓");
    process.exit(0);
  } else {
    console.error(`${failures} check(s) failed`);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
