import Button from "@components/Button";
import Code from "@components/Code";
import Steps from "@components/Steps";
import { SelectDropdown, SelectOption } from "@components/select/SelectDropdown";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { GRPC_API_ORIGIN } from "@utils/netbird";
import { DownloadIcon, ShoppingBagIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import React, { useState, useEffect } from "react";
import GooglePlayButton from "@/assets/google-play-badge.png";
import { useI18n } from "@/i18n/I18nProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import useFetchApi from "@utils/api";
import { VersionRelease } from "@/modules/settings/VersionReleasesTab";

export default function AndroidTab() {
  const { t } = useI18n();
  const { data: versions, isLoading } = useFetchApi<VersionRelease[]>("/version-releases");
  const [selectedVersion, setSelectedVersion] = useState<string>("");

  const androidVersions = (versions || []).filter((v) => v.platform === "android");
  
  // Only show published versions
  const versionOptions: SelectOption[] = androidVersions.map((v) => ({
    label: v.version + (v.isLatest ? " (最新)" : ""),
    value: v.downloadUrl,
  }));

  useEffect(() => {
    if (androidVersions.length > 0) {
      const latestVersion = androidVersions.find((v) => v.isLatest) || androidVersions[0];
      setSelectedVersion(latestVersion.downloadUrl);
    }
  }, [androidVersions]);

  const currentUrl = selectedVersion || "";

  return (
    <TabsContent value={String(OperatingSystem.ANDROID)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <ShoppingBagIcon size={16} />
          {t("setupModal.androidInstallTitle")}
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p>{t("setupModal.androidStep1")}</p>
            <div className={"flex gap-4 mt-1 flex-wrap items-center"}>
              <SelectDropdown
                value={currentUrl}
                className={"w-[170px]"}
                onChange={setSelectedVersion}
                placeholder={versionOptions.length === 0 ? "请先发布版本" : t("setupModal.selectArchitecture")}
                options={versionOptions}
              />
              {versionOptions.length > 0 ? (
                <Button 
                  variant={"primary"} 
                  onClick={() => window.open(currentUrl, "_blank", "noopener noreferrer")}
                >
                  <DownloadIcon size={14} />
                  {t("setupModal.downloadNetBird")}
                </Button>
              ) : (
                <Button variant={"primary"} disabled>
                  <DownloadIcon size={14} />
                  请先在设置中发布版本
                </Button>
              )}
            </div>
            <div className={"mt-2"}>
              <Link
                href={"https://play.google.com/store/apps/details?id=io.netbird.client"}
                target={"_blank"}
              >
                <Image
                  src={GooglePlayButton}
                  alt={t("setupModal.googlePlayAlt")}
                  height={50}
                />
              </Link>
            </div>
          </Steps.Step>
          {GRPC_API_ORIGIN && (
            <Steps.Step step={2}>
              <p>{t("setupModal.changeServerInstructions")}</p>
              <Code>
                <Code.Line>{GRPC_API_ORIGIN}</Code.Line>
              </Code>
            </Steps.Step>
          )}

          <Steps.Step step={GRPC_API_ORIGIN ? 3 : 2}>
            <p>{t("setupModal.clickConnectCenter")}</p>
          </Steps.Step>
          <Steps.Step step={GRPC_API_ORIGIN ? 4 : 3} line={false}>
            <p>{t("setupModal.signUpWithEmail")}</p>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
    </TabsContent>
  );
}
