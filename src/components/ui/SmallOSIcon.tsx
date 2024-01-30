import Image from "next/image";
import { useMemo } from "react";
import { FaWindows } from "react-icons/fa6";
import { FcAndroidOs, FcLinux } from "react-icons/fc";
import AppleLogo from "@/assets/os-icons/apple.svg";
import { getOperatingSystem } from "@/hooks/useOperatingSystem";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

export default function SmallOSIcon({ os }: { os: string }) {
  const icon = useMemo(() => {
    return getOperatingSystem(os.toLowerCase());
  }, [os]);

  if (icon === OperatingSystem.WINDOWS)
    return <FaWindows className={"text-white text-md min-w-[20px]"} />;
  if (icon === OperatingSystem.APPLE)
    return (
      <div className={"min-w-[20px] flex items-center justify-center"}>
        <Image src={AppleLogo} alt={""} width={12} />
      </div>
    );
  if (icon === OperatingSystem.ANDROID)
    return <FcAndroidOs className={"text-white text-xl min-w-[20px]"} />;

  return <FcLinux className={"text-white text-lg min-w-[20px]"} />;
}
