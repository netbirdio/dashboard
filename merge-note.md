# Merge Note

## PR Title

`Add initial Chinese i18n support and continue dashboard/app localization`

## PR Description

```md
## Summary

This change continues the i18n adaptation work for the dashboard and extends Chinese (`zh-CN`) coverage across multiple app routes and modules.

## What was done

- Extended `src/i18n/messages.ts` with additional translation keys for:
  - control center
  - remote access (SSH/RDP)
  - error page
  - invite acceptance flow
- Replaced remaining hardcoded UI strings in several routes with `useI18n()` translations.
- Localized user-facing loading/error/disconnect states in remote access flows.
- Localized the error page and invite acceptance page.
- Added and maintained `i18n.md` as a handoff document for future continuation.

## Important metadata note

`metadata.title` values in `src/app/**/layout.tsx` were intentionally kept in English.

Reason:
the current locale is client-side (`localStorage`), while Next.js metadata is defined at the static/server layer. Because of that, metadata titles are not yet locale-aware and should not be hardcoded to Chinese.

Current rule:
- UI text can be localized
- metadata titles remain in English until a server-readable locale strategy is introduced

## Key areas updated

- `src/i18n/messages.ts`
- `src/app/(dashboard)/control-center/page.tsx`
- `src/app/(dashboard)/team/user/page.tsx`
- `src/app/(dashboard)/peer/page.tsx`
- `src/app/(remote-access)/peer/ssh/page.tsx`
- `src/app/(remote-access)/peer/rdp/page.tsx`
- `src/modules/remote-access/ssh/useSSH.ts`
- `src/modules/remote-access/rdp/useRemoteDesktop.ts`
- `src/modules/remote-access/useNetBirdClient.ts`
- `src/app/error/page.tsx`
- `src/app/invite/page.tsx`
- `src/app/install/layout.tsx`
- `i18n.md`

## Follow-up recommendations

- Continue with the remaining high-priority residual files listed in `i18n.md`
- Standardize all remaining date/time formats through translation keys
- Run a final residual-English scan before release
```

## Short Merge Note

```text
This branch adds and continues zh-CN i18n coverage across dashboard pages, remote access flows, the error page, and the invite flow. Metadata titles were intentionally kept in English because they are not yet locale-aware at the Next.js server/static layer.
```

