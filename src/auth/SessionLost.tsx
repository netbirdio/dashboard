import { useOidc } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import Paragraph from "@components/Paragraph";
import loadConfig from "@utils/config";
import { LogIn } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { useEffect } from "react";
import NetBirdIcon from "@/assets/icons/NetBirdIcon";

const config = loadConfig();

export const SessionLost = () => {
  const router = useRouter();
  const { logout } = useOidc();

  useEffect(() => {
    router.push("/peers");
  });

  return (
    <div
      className={
        "flex items-center justify-center flex-col h-screen max-w-md mx-auto"
      }
    >
      <div
        className={
          "bg-gray-100 dark:bg-nb-gray-930 mb-3 border border-gray-200 dark:border-nb-gray-900 h-10 w-10 rounded-md flex items-center justify-center "
        }
      >
        <NetBirdIcon size={20} />
      </div>
      <h1>Session Expired</h1>
      <Paragraph className={"text-center"}>
        It looks like your login session is no longer active or has expired.
        Please login again to continue using the app.
      </Paragraph>
      <Button
        variant={"primary"}
        size={"sm"}
        className={"mt-5"}
        onClick={() => logout("", { client_id: config.clientId })}
      >
        Login
        <LogIn size={16} />
      </Button>
    </div>
  );
};
