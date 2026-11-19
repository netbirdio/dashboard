# Dashboard translations

The dashboard is a static Next.js export. The prerendered site and initial
hydration use English. After hydration, the language menu in the dashboard
header restores the browser's saved choice. The choice is per origin and
changes the current document language without reloading the page or
remounting forms. A missing message uses the English message and its plural
rules.

## Add a language

1. Add a JSON catalog to `src/i18n/messages/` and use a canonical BCP 47
   language tag as the filename, such as `fr.json`. The English catalog
   defines the keys. A new catalog may start with a subset.
2. Register the catalog, its native display name, its text direction and its
   calendar locale in `src/i18n/locales.ts`. The language menu reads that
   registry. For a right-to-left language, also verify the affected layouts.
3. Run `npm run test:unit -- src/i18n` and `npm run build`. Check the
   dashboard in English and the new language, including changing language
   while a form or filter is open.

## Add a message

Use a stable key named for the text's purpose. Place strings that belong to
a feature in its namespace, and use `common` for labels that intentionally
share the same meaning. A client component reads the message with
`useTranslations()` from `@/i18n/LocaleProvider`.

Keep an entire sentence in one message. Use ICU arguments for names, counts
and other values, and `t.rich` for a sentence containing links or styled
text. All languages must keep the same argument and markup tag names.
Plural cases can follow the target language's rules. Static TanStack column
definitions can pass a message key via `DataTableHeader.labelId`. When
translating custom radio options, give them stable `id` values and preserve
the existing filter `value`. Include the translator in the dependencies of
memoized filter definitions so their labels and chips update together.

Keep route segments,
API values, object names supplied by users, selectors and test IDs separate
from translation keys.

Use “节点” for peers, “注册密钥” for setup keys, “设备合规检查” for
posture checks, and “智能体策略” for agent policies in Simplified Chinese.

The current catalogs cover migrated dashboard strings. Server-provided
messages, bundled release notes and static page metadata are separate from
the client message catalogs.
