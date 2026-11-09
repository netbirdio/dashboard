import loadConfig from "@utils/config";
import { cn } from "@utils/helpers";
import Image from "next/image";
import * as React from "react";
import NetBirdLogoMark from "@/assets/netbird.svg";
import NetBirdLogoFull from "@/assets/netbird-full.svg";

const config = loadConfig();

type Props = {
  size?: "default" | "large";
  mobile?: boolean;
  // logoUrl replaces the NetBird logo with the deployment's own one. Defaults
  // to the operator's NETBIRD_BRAND_LOGO_URL, if any.
  logoUrl?: string;
};

const sizes = {
  default: {
    desktop: 22,
    mobile: 30,
  },
  large: {
    desktop: 24,
    mobile: 40,
  },
};

export const NetBirdLogo = ({
  size = "default",
  mobile = true,
  logoUrl = config.branding.logoUrl,
}: Props) => {
  if (logoUrl) {
    // A deployment has a single logo of unknown proportions, so it is fitted
    // to the height of the NetBird one on every screen size.
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={config.branding.name ?? "Logo"}
        style={{ height: sizes[size].desktop }}
        className={cn(
          "w-auto max-w-[180px] object-contain",
          mobile && "ml-4 md:ml-0",
        )}
      />
    );
  }

  return (
    <>
      <Image
        src={NetBirdLogoFull}
        height={sizes[size].desktop}
        alt={"NetBird Logo"}
        className={cn(mobile && "hidden md:block")}
      />
      {mobile && (
        <Image
          src={NetBirdLogoMark}
          width={sizes[size].mobile}
          alt={"NetBird Logo"}
          className={cn(mobile && "md:hidden ml-4")}
        />
      )}
    </>
  );
};
