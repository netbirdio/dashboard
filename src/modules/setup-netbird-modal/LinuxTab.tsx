import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import Button from "@components/Button";
import Code from "@components/Code";
import Separator from "@components/Separator";
import { SelectDropdown, SelectOption } from "@components/select/SelectDropdown";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { IconBrandUbuntu } from "@tabler/icons-react";
import { getNetBirdUpCommand } from "@utils/netbird";
import { DownloadIcon, TerminalSquareIcon } from "lucide-react";
import React, { useState, useEffect } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import useFetchApi from "@utils/api";
import {
  HostnameParameter,
  RoutingPeerSetupKeyInfo,
  SetupKeyParameter,
} from "@/modules/setup-netbird-modal/SetupModal";
import { VersionRelease } from "@/modules/settings/VersionReleasesTab";

type Props = {
  setupKey?: string;
  showSetupKeyInfo?: boolean;
  hostname?: string;
};

export default function LinuxTab({
  setupKey,
  showSetupKeyInfo = false,
  hostname,
}: Readonly<Props>) {
  const { t } = useI18n();
  const { data: versions, isLoading } = useFetchApi<VersionRelease[]>("/version-releases");
  const [selectedVersion, setSelectedVersion] = useState<string>("");
  const [currentOrigin, setCurrentOrigin] = useState<string>("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      setCurrentOrigin(window.location.origin);
    }
  }, []);

  const linuxVersions = (versions || []).filter((v) => v.platform === "linux");
  
  // Only show published versions
  const versionOptions: SelectOption[] = linuxVersions.map((v) => ({
    label: v.version + (v.isLatest ? " (最新)" : ""),
    value: v.downloadUrl,
  }));

  useEffect(() => {
    if (linuxVersions.length > 0) {
      const latestVersion = linuxVersions.find((v) => v.isLatest) || linuxVersions[0];
      setSelectedVersion(latestVersion.downloadUrl);
    }
  }, [linuxVersions]);

  const currentUrl = selectedVersion || "";
  const oneLineInstallCommand = currentOrigin 
    ? `curl -fsSL ${currentOrigin}/install.sh | bash -s -- ${currentOrigin}`
    : "";

  return (
    <TabsContent value={String(OperatingSystem.LINUX)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <TerminalSquareIcon size={16} />
          使用命令行一键安装
        </p>
        <Steps>
          <Steps.Step step={1}>
            <p className="text-sm text-nb-gray-400 mb-2">
              运行下面的命令一键安装 Cloink（支持主流 Linux 发行版：Ubuntu、Debian、CentOS、Fedora、Arch 等）
            </p>
            {oneLineInstallCommand && (
              <Code>
                <Code.Line>{oneLineInstallCommand}</Code.Line>
              </Code>
            )}
          </Steps.Step>
          <Steps.Step step={2} line={false}>
            <p>
              {t("setupModal.runNetBird")}
              {!setupKey && ` ${t("setupModal.andLogInBrowser")}`}
              {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
            </p>
            <Code>
              <Code.Line>
                {getNetBirdUpCommand()}
                <SetupKeyParameter setupKey={setupKey} />
                <HostnameParameter hostname={hostname} />
              </Code.Line>
            </Code>
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
      
      <Separator />
      
      <TabsContentPadding>
        <Accordion type="single" collapsible>
          <AccordionItem value="manual">
            <AccordionTrigger>
              <IconBrandUbuntu size={16} />
              手动安装（通用）
            </AccordionTrigger>
            <AccordionContent>
              <Steps>
                <Steps.Step step={1}>
                  <p className="mb-2">选择并下载 Cloink</p>
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
                        下载
                      </Button>
                    ) : (
                      <Button variant={"primary"} disabled>
                        <DownloadIcon size={14} />
                        请先在设置中发布版本
                      </Button>
                    )}
                  </div>
                  {currentUrl && (
                    <div className="mt-3">
                      <Code
                        codeToCopy={`curl -L "${currentUrl}" -o cloink.tar.gz`}
                      >
                        <Code.Line>{`curl -L "${currentUrl}" -o cloink.tar.gz`}</Code.Line>
                      </Code>
                    </div>
                  )}
                </Steps.Step>
                <Steps.Step step={2}>
                  <p>解压并安装</p>
                  <Code
                    codeToCopy={`# 解压
tar -xzf cloink.tar.gz
cd cloink-linux-*

# 安装二进制文件
sudo cp cloink /usr/bin/
sudo cp cloink-ui /usr/bin/ 2>/dev/null || true
sudo chmod +x /usr/bin/cloink /usr/bin/cloink-ui 2>/dev/null || sudo chmod +x /usr/bin/cloink

# 安装 systemd 服务
if [ -d systemd ]; then
  sudo cp systemd/*.service /etc/systemd/system/
  sudo systemctl daemon-reload
  sudo systemctl enable --now cloink
fi`}
                  >
                    <Code.Comment># 解压</Code.Comment>
                    <Code.Line>tar -xzf cloink.tar.gz</Code.Line>
                    <Code.Line>cd cloink-linux-*</Code.Line>
                    <Code.Comment># 安装二进制文件</Code.Comment>
                    <Code.Line>sudo cp cloink /usr/bin/</Code.Line>
                    <Code.Line>{`sudo cp cloink-ui /usr/bin/ 2>/dev/null || true`}</Code.Line>
                    <Code.Line>{`sudo chmod +x /usr/bin/cloink /usr/bin/cloink-ui 2>/dev/null || sudo chmod +x /usr/bin/cloink`}</Code.Line>
                    <Code.Comment># 安装 systemd 服务</Code.Comment>
                    <Code.Line>if [ -d systemd ]; then</Code.Line>
                    <Code.Line>  sudo cp systemd/*.service /etc/systemd/system/</Code.Line>
                    <Code.Line>  sudo systemctl daemon-reload</Code.Line>
                    <Code.Line>  sudo systemctl enable --now cloink</Code.Line>
                    <Code.Line>fi</Code.Line>
                  </Code>
                </Steps.Step>
                <Steps.Step step={3} line={false}>
                  <p>
                    {t("setupModal.runNetBird")}
                    {!setupKey && ` ${t("setupModal.andLogInBrowser")}`}
                    {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
                  </p>
                  <Code>
                    <Code.Line>
                      {getNetBirdUpCommand()}
                      <SetupKeyParameter setupKey={setupKey} />
                      <HostnameParameter hostname={hostname} />
                    </Code.Line>
                  </Code>
                </Steps.Step>
              </Steps>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </TabsContentPadding>
    </TabsContent>
  );
}
