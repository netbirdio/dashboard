# Dashboard translations

The dashboard uses i18next and react-i18next. English is the default and fallback
language, including when the browser requests another language. Open Settings →
Language to choose a language. Changes apply immediately, including for users
without permission to manage account settings. The choice is stored locally
under `netbird.language`, persists across reloads, and synchronizes between tabs.
It is a browser preference, not an account setting. If browser storage is blocked,
switching still works for the current session.

The supported language codes and native picker labels match the
[NetBird desktop client language index](https://github.com/netbirdio/netbird/blob/9f8ddc71315bc40f5c98dca82cd902ec1a9f59dd/client/ui/i18n/locales/_index.json):

| Code    | Language     |
| ------- | ------------ |
| `en`    | English (US) |
| `uk`    | Українська   |
| `de`    | Deutsch      |
| `hu`    | Magyar       |
| `ru`    | Русский      |
| `es`    | Español      |
| `fr`    | Français     |
| `it`    | Italiano     |
| `pt`    | Português    |
| `zh-CN` | 简体中文     |
| `ja`    | 日本語       |

All catalogs cover the same 209 messages. Relative dates and date tooltips in
shared last-activity cells follow the selected language. Other date widgets have
not yet been migrated. These initial dashboard translations need native-speaker
review; they are separate from the desktop client's Crowdin-managed catalogs.

The initial translation covers navigation, account/help menus, the main list pages
for peers, groups, access policies, networks, routes, posture checks, users,
service users, nameservers and DNS zones, DNS settings, settings navigation,
setup keys, and shared search, empty states and pagination. Detailed editors,
onboarding, cloud-specific features, billing screens, and server error messages
remain English and can be migrated separately.

## Adding UI text

Catalogs live in `src/i18n/locales/<code>.json`. Keys are complete English
source messages; key and namespace separators are disabled so punctuation remains
literal. Keep all catalogs in sync. Do not translate API values, routes, resource
names, user content, identifiers, commands or product names.

Use `useTranslation` from `@/i18n/useTranslation` inside React components:

```tsx
const { t } = useTranslation();
return <input placeholder={t("Search...")} />;
```

For text in static column definitions, use the subscribed `T` component:

```tsx
<DataTableHeader column={column}>
  <T>{"Name"}</T>
</DataTableHeader>
```

Use complete messages with named interpolation values rather than concatenating
sentence fragments. For counts that require grammatical forms, use i18next's
`count` option and the appropriate `_one`, `_few`, `_many`, `_other` catalog keys.
Include `t` in dependency lists for memoized translated labels. Never initialize
translations at module scope or change the global dayjs locale for a user.

When adding a language, register its catalog and native name in `config.ts`, and
import its Day.js locale in `dateLocale.ts`. Day.js locale identifiers are lowercase
(for example, `zh-CN` maps to `zh-cn`). The language menu scrolls when space is
limited. Keep required interpolation placeholders intact; the pagination message
may omit `{{kind}}` to avoid inserting an English noun into an inflected sentence.

`LanguageProvider` owns an isolated i18next instance. Server output and the first
client render always use English; the saved preference is restored after hydration.
Avoid a browser language detector or locale URL prefixes: the dashboard is exported
as static files and existing routes and authentication redirects must keep working.

Run `npm run test:unit -- src/i18n`, `npx tsc --noEmit`,
and `npm run build` when changing language handling. Verify longer labels at mobile
widths. The tests exercise switching and restoring every supported language,
catalog parity, interpolation placeholders, and localized date formatting.
Full authentication flows require a configured
management service and identity provider.
