"use client";

import Code from "@components/Code";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { GRPC_API_ORIGIN } from "@utils/netbird";
import { ShoppingBagIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import Image from "next/image";
import Link from "next/link";
import React from "react";
import GooglePlayButton from "@/assets/google-play-badge.png";
import { OperatingSystem } from "@/interfaces/OperatingSystem";

export default function AndroidTab() {
  const t = useTranslations("setupModal");
  return (
    <TabsContent value={String(OperatingSystem.ANDROID)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <ShoppingBagIcon size={16} />
          {t("installOnAndroid")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>{t("downloadFromGooglePlay")}</p>
            <div className={"flex gap-4 mt-1"}>
              <Link
                href={
                  "https://play.google.com/store/apps/details?id=io.netbird.client"
                }
                target={"_blank"}
              >
                <Image
                  src={GooglePlayButton}
                  alt={t("googlePlayAlt")}
                  height={50}
                />
              </Link>
            </div>
          </Steps.Step>
          {GRPC_API_ORIGIN && (
            <Steps.Step step={2}>
              <p>
                {t("changeServer")}
              </p>
              <Code>
                <Code.Line>{GRPC_API_ORIGIN}</Code.Line>
              </Code>
            </Steps.Step>
          )}

          <Steps.Step step={GRPC_API_ORIGIN ? 3 : 2}>
            <p>
              {/* eslint-disable-next-line react/no-unescaped-entities */}
              {t("clickConnectButton")}
            </p>
          </Steps.Step>
          <Steps.Step step={GRPC_API_ORIGIN ? 4 : 3} line={false}>
            <p>{t("signUpWithEmail")}</p>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
