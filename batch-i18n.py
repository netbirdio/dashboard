"""Batch i18n localization for remaining simple files"""
import re, os

os.chdir('/root/github_projects/dashboard')

# Helper: replace first occurrence after a marker
def replace_in_file(filepath, replacements):
    with open(filepath) as f:
        content = f.read()
    changed = False
    for old, new in replacements:
        if old in content:
            content = content.replace(old, new, 1)
            changed = True
            print(f"  {os.path.basename(filepath)}: replaced '{old[:40]}'")
        else:
            print(f"  WARN: '{old[:40]}' not in {os.path.basename(filepath)}")
    if changed:
        with open(filepath, 'w') as f:
            f.write(content)

# === 1. AddRouteDropdownButton.tsx ===
replace_in_file('src/modules/peer/AddRouteDropdownButton.tsx', [
    ('import Button from "@components/Button";',
     'import { useTranslations } from "next-intl";\nimport Button from "@components/Button";'),
    ('export default function AddRouteDropdownButton() {',
     'export default function AddRouteDropdownButton() {\n  const t = useTranslations("common");'),
    ('New Network Route', '{t("newNetworkRoute")}'),
    ('Existing Network', '{t("existingNetwork")}'),
])

# === 2. RemoteJobDropdownButton.tsx ===
replace_in_file('src/modules/peer/RemoteJobDropdownButton.tsx', [
    ('import Button from "@components/Button";',
     'import { useTranslations } from "next-intl";\nimport Button from "@components/Button";'),
    ('export const RemoteJobDropdownButton = () => {',
     'export const RemoteJobDropdownButton = () => {\n  const t = useTranslations("common");'),
    ('Debug Bundle', '{t("debugBundle")}'),
])

# === 3. RouteMetricCell.tsx ===
replace_in_file('src/modules/routes/RouteMetricCell.tsx', [
    ('import FullTooltip from "@components/FullTooltip";',
     'import { useTranslations } from "next-intl";\nimport FullTooltip from "@components/FullTooltip";'),
    ('export default function RouteMetricCell({',
     'export default function RouteMetricCell({\n  const t = useTranslations("common");'),
    ('Lower metrics have higher priority.', '{t("metricPriority")}'),
])

# === 4. PeerRoutesTable.tsx ===
replace_in_file('src/modules/peer/PeerRoutesTable.tsx', [
    ('import Card from "@components/Card";',
     'import { useTranslations } from "next-intl";\nimport Card from "@components/Card";'),
    ('export const RouteTableColumns: ColumnDef<Route>[] = [',
     'function RouteTableColumns(t: ReturnType<typeof useTranslations>): ColumnDef<Route>[] {\n  return ['),
    ('];\n\nexport default function PeerRoutesTable({',
     '];\n}\n\nexport default function PeerRoutesTable({'),
    ('export default function PeerRoutesTable({',
     'export default function PeerRoutesTable({\n  const t = useTranslations("common");'),
    ('];\n\nfunction RouteTableColumns', '];\n}\n\nfunction RouteTableColumns'),  # fix double close
])

# Replace column headers in PeerRoutesTable
with open('src/modules/peer/PeerRoutesTable.tsx') as f:
    c = f.read()
c = c.replace('DataTableHeader column={column}>Name<', 'DataTableHeader column={column}>{t("name")}<')
c = c.replace('DataTableHeader column={column}>Network<', 'DataTableHeader column={column}>{t("network")}<')
c = c.replace('DataTableHeader column={column}>Distribution Groups<', 'DataTableHeader column={column}>{t("distributionGroups")}<')
c = c.replace('DataTableHeader column={column}>Active<', 'DataTableHeader column={column}>{t("active")}<')
with open('src/modules/peer/PeerRoutesTable.tsx', 'w') as f:
    f.write(c)
print("  PeerRoutesTable: column headers replaced")

# === 5. Add keys to en.ts ===
with open('src/i18n/messages/en.ts') as f:
    en = f.read()

# Add to common namespace (after debugBundle or similar)
if 'debugBundle' not in en:
    en = en.replace(
        'routingPeer: "Routing Peer",',
        'routingPeer: "Routing Peer",\n    newNetworkRoute: "New Network Route",\n    existingNetwork: "Existing Network",\n    debugBundle: "Debug Bundle",\n    metricPriority: "Lower metrics have higher priority.",'
    )

with open('src/i18n/messages/en.ts', 'w') as f:
    f.write(en)
print("  en.ts: keys added")

# === 6. Add keys to zh.ts ===
with open('src/i18n/messages/zh.ts') as f:
    zh = f.read()

if 'debugBundle' not in zh:
    zh = zh.replace(
        'routingPeer: "路由节点",',
        'routingPeer: "路由节点",\n    newNetworkRoute: "新网络路由",\n    existingNetwork: "现有网络",\n    debugBundle: "调试包",\n    metricPriority: "较低的度量值具有更高的优先级。"'
    )

with open('src/i18n/messages/zh.ts', 'w') as f:
    f.write(zh)
print("  zh.ts: Chinese translations added")

print("\nDone!")
