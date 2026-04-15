"use client";

import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";

export default function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme } = useTheme();
  const { t } = useI18n();

  useEffect(() => {
    setMounted(true);
  }, []);

  return mounted ? (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button className={"!px-3"} variant={"default"}>
          <div>
            <SunIcon
              size={16}
              className={"scale-100 dark:scale-0 dark:absolute relative"}
            />
            <MoonIcon
              size={16}
              className={"scale-0 dark:scale-100 absolute dark:relative"}
            />
          </div>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side={"bottom"} align={"end"}>
        <DropdownMenuItem
          onClick={() => setTheme("light")}
          className={"flex gap-2"}
          disabled={true}
        >
          <SunIcon size={16} />
          {t('darkModeToggle.light')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={"flex gap-2"}
        >
          <MoonIcon size={16} />
          {t('darkModeToggle.dark')}
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={true}
          onClick={() => setTheme("system")}
          className={"flex gap-2"}
        >
          <MonitorIcon size={16} />
          {t('darkModeToggle.system')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
}
