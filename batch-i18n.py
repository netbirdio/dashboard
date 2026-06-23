import re
import os

os.chdir('/root/github_projects/dashboard')

# List of files and their replacements
tasks = [
    {
        'file': 'src/modules/peer/AddRouteDropdownButton.tsx',
        'import_replace': ('import Button from "@components/Button";', 'import { useTranslations } from "next-intl";\nimport Button from "@components/Button";'),
        'function_replace': ('export default function AddRouteDropdownButton({', 'export default function AddRouteDropdownButton({\n  const t = useTranslations("common");'),
        'text_replacements': [
            ('New Network Route', '{t("newNetworkRoute")}'),
            ('Existing Network', '{t("existingNetwork")}'),
        ]
    },
    {
        'file': 'src/modules/peer/RemoteJobDropdownButton.tsx',
        'import_replace': ('import Button from "@components/Button";', 'import { useTranslations } from "next-intl";\nimport Button from "@components/Button";'),
        'function_replace': ('export default function RemoteJobDropdownButton({', 'export default function RemoteJobDropdownButton({\n  const t = useTranslations("common");'),
        'text_replacements': [
            ('Debug Bundle', '{t("debugBundle")}'),
        ]
    },
    {
        'file': 'src/modules/routes/RouteMetricCell.tsx',
        'import_replace': ('import FullTooltip from "@components/FullTooltip";', 'import { useTranslations } from "next-intl";\nimport FullTooltip from "@components/FullTooltip";'),
        'function_replace': ('export default function RouteMetricCell({\n  metric,\n  useHoverStyle = true,\n}: Readonly<Props>) {', 'export default function RouteMetricCell({\n  metric,\n  useHoverStyle = true,\n}: Readonly<Props>) {\n  const t = useTranslations("common");'),
        'text_replacements': [
            ('Lower metrics have higher priority.', '{t("metricPriority")}'),
        ]
    },
]

for task in tasks:
    filepath = task['file']
    with open(filepath) as f:
        content = f.read()
    
    changed = False
    
    # Apply import replacement
    old_import, new_import = task['import_replace']
    if old_import in content:
        content = content.replace(old_import, new_import)
        changed = True
        print(f"{filepath}: import added")
    
    # Apply function replacement
    old_func, new_func = task['function_replace']
    if old_func in content:
        content = content.replace(old_func, new_func)
        changed = True
        print(f"{filepath}: t() added")
    else:
        print(f"{filepath}: WARNING - function pattern not found!")
    
    # Apply text replacements
    for old, new in task['text_replacements']:
        if old in content:
            content = content.replace(old, new)
            changed = True
            print(f"{filepath}: '{old}' -> '{new}'")
        else:
            print(f"{filepath}: WARNING - '{old}' not found!")
    
    if changed:
        with open(filepath, 'w') as f:
            f.write(content)
        print(f"{filepath}: saved")
    print()

print("Done!")
