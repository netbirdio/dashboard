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

export default function DarkModeToggle() {
  const [mounted, setMounted] = useState(false);
  const { setTheme } = useTheme();

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
        >
          <SunIcon size={16} />
          Light
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("dark")}
          className={"flex gap-2"}
        >
          <MoonIcon size={16} />
          Dark
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => setTheme("system")}
          className={"flex gap-2"}
        >
          <MonitorIcon size={16} />
          System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  ) : null;
}
