"use client";

import Button from "@components/Button";
import DarkModeToggle from "@components/ui/DarkModeToggle";
import UserDropdown from "@components/ui/UserDropdown";
import { Navbar } from "flowbite-react";
import { MenuIcon } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import NetBirdLogo from "@/assets/netbird.svg";
import { useApplicationContext } from "@/contexts/ApplicationProvider";

export default function NavbarWithDropdown() {
  const router = useRouter();
  const Logo = useMemo(() => {
    return <Image src={NetBirdLogo} width={30} alt={"NetBird Logo"} />;
  }, []);

  const { toggleMobileNav } = useApplicationContext();

  return (
    <>
      <Navbar
        fluid
        className={
          "border-b dark:border-zinc-700/40 fixed z-50 h-[75px] px-3 md:px-4 w-full"
        }
      >
        <div className={"flex items-center gap-4 md:hidden"}>
          <Button
            className={"!px-3 md:hidden"}
            variant={"default-outline"}
            onClick={toggleMobileNav}
          >
            <div>
              <MenuIcon size={20} className={"relative"} />
            </div>
          </Button>
        </div>
        <Navbar.Brand
          onClick={() => router.push("/peers")}
          className={"cursor-pointer hover:opacity-70 transition-all"}
        >
          {Logo}
        </Navbar.Brand>

        <div className="flex md:order-2 gap-4">
          <div className={"hidden md:block"}>
            <DarkModeToggle />
          </div>

          <UserDropdown />
        </div>
      </Navbar>
      <div className={"h-[75px]"}></div>
    </>
  );
}
