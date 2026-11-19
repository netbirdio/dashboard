import Code from "@components/Code";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { GRPC_API_ORIGIN } from "@utils/netbird";
import { ShoppingBagIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import GooglePlayButton from "@/assets/google-play-badge.png";
import { useTranslations } from "@/i18n/LocaleProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

export default function AndroidTab() {
  const t = useTranslations();
  return (
    <TabsContent value={String(OperatingSystem.ANDROID)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <ShoppingBagIcon size={16} />
          {t("setupNetbirdModal.installOnAndroid")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>{t("setupNetbirdModal.downloadFromGooglePlay")}</p>
            <div className={"flex gap-4 mt-1"}>
              <Link
                href={
                  "https://play.google.com/store/apps/details?id=io.netbird.client"
                }
                target={"_blank"}
              >
                <Image
                  src={GooglePlayButton}
                  alt={"Download NetBird from Google Play"}
                  height={50}
                />
              </Link>
            </div>
          </Steps.Step>
          {GRPC_API_ORIGIN && (
            <Steps.Step step={2}>
              <p>
                {t("setupNetbirdModal.changeServer")}
              </p>
              <Code>
                <Code.Line>{GRPC_API_ORIGIN}</Code.Line>
              </Code>
            </Steps.Step>
          )}

          <Steps.Step step={GRPC_API_ORIGIN ? 3 : 2}>
            <p>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              {t("setupNetbirdModal.clickConnectButton")}
            </p>
          </Steps.Step>
          <Steps.Step step={GRPC_API_ORIGIN ? 4 : 3} line={false}>
            <p>{t("setupNetbirdModal.signUpWithEmail")}</p>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
