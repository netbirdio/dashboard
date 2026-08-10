import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import { Callout } from "@components/Callout";
import Code from "@components/Code";
import { SelectDropdown } from "@components/select/SelectDropdown";
import Separator from "@components/Separator";
import Steps from "@components/Steps";
import TabsContentPadding, { TabsContent } from "@components/Tabs";
import { PackageIcon, TerminalSquareIcon } from "lucide-react";
import React, { useState } from "react";
import { OperatingSystem } from "@/interfaces/OperatingSystem";
import {
  NetBirdUpCommand,
  RoutingPeerSetupKeyInfo,
} from "@/modules/setup-netbird-modal/SetupModal";

type Props = {
  setupKey?: string;
  setupKeyContent?: React.ReactNode;
  setupKeyPlaceholder?: string;
  showSetupKeyInfo?: boolean;
  hostname?: string;
};

type Distro = {
  label: string;
  value: string;
  /** Commands that register the NetBird package repository. */
  repository: string[];
  /** Commands that run before the install lines, after the repository is added. */
  beforeInstall?: string[];
  cli: string;
  /**
   * Desktop app install lines. Omitted when the distribution cannot run it,
   * in which case only the CLI is offered.
   */
  desktopApp?: string[];
  note: string;
};

const YUM_REPOSITORY = [
  "sudo tee /etc/yum.repos.d/netbird.repo <<EOF",
  "[netbird]",
  "name=netbird",
  "baseurl=https://pkgs.netbird.io/yum/",
  "enabled=1",
  "gpgcheck=1",
  "gpgkey=https://pkgs.netbird.io/yum/repodata/repomd.xml.key",
  "repo_gpgcheck=1",
  "EOF",
];

// The legacy GTK3 netbird-ui build keeps the current package name, so it is
// served from its own repository path. Registered alongside YUM_REPOSITORY,
// which still provides the CLI.
const YUM_GTK3_REPOSITORY = [
  ...YUM_REPOSITORY,
  "sudo tee /etc/yum.repos.d/netbird-gtk3.repo <<EOF",
  "[netbird-gtk3]",
  "name=netbird-gtk3",
  "baseurl=https://pkgs.netbird.io/yum-gtk3/\\$basearch",
  "enabled=1",
  "gpgcheck=1",
  "gpgkey=https://pkgs.netbird.io/yum/repodata/repomd.xml.key",
  "repo_gpgcheck=0",
  "EOF",
];

// The desktop app links GTK 4.10+ and WebKitGTK 6.0, and the released
// packages do not declare those as dependencies, so each install line names
// them explicitly. Distributions below that floor get the CLI only.
const DISTROS: Distro[] = [
  {
    label: "Debian / Ubuntu (APT)",
    value: "apt",
    repository: [
      "sudo apt-get update",
      "sudo apt-get install ca-certificates curl gnupg -y",
      "curl -sSL https://pkgs.netbird.io/debian/public.key | sudo gpg --dearmor --output /usr/share/keyrings/netbird-archive-keyring.gpg",
      `echo 'deb [signed-by=/usr/share/keyrings/netbird-archive-keyring.gpg] https://pkgs.netbird.io/debian stable main' | sudo tee /etc/apt/sources.list.d/netbird.list`,
    ],
    beforeInstall: ["sudo apt-get update"],
    cli: "sudo apt-get install netbird",
    desktopApp: [
      "sudo apt-get install netbird-ui libgtk-4-1 libwebkitgtk-6.0-4 xdg-utils",
    ],
    note: "The desktop app needs Ubuntu 24.04 or Debian 13 and newer. On earlier releases install the CLI only.",
  },
  {
    // Legacy GTK3 / WebKit2GTK 4.1 build of the desktop app, for releases
    // without WebKitGTK 6.0. It keeps the netbird-ui package name, so it is
    // served from the `gtk3` distribution instead of `stable`; the CLI still
    // comes from `stable`, hence both lists are registered.
    label: "Ubuntu 22.04 / Debian 12 (APT)",
    value: "apt-gtk3",
    repository: [
      "sudo apt-get update",
      "sudo apt-get install ca-certificates curl gnupg -y",
      "curl -sSL https://pkgs.netbird.io/debian/public.key | sudo gpg --dearmor --output /usr/share/keyrings/netbird-archive-keyring.gpg",
      `echo 'deb [signed-by=/usr/share/keyrings/netbird-archive-keyring.gpg] https://pkgs.netbird.io/debian stable main' | sudo tee /etc/apt/sources.list.d/netbird.list`,
      `echo 'deb [signed-by=/usr/share/keyrings/netbird-archive-keyring.gpg] https://pkgs.netbird.io/debian gtk3 main' | sudo tee /etc/apt/sources.list.d/netbird-gtk3.list`,
      // On Ubuntu, libwebkit2gtk-4.1-0 comes from the universe component. It is
      // enabled on stock images but can be switched off. Guarded by the ID
      // check: `universe` is an Ubuntu-only shortcut that Debian rejects.
      `if . /etc/os-release && [ "$ID" = ubuntu ]; then sudo apt-get install software-properties-common -y && sudo add-apt-repository -y universe; fi`,
    ],
    beforeInstall: ["sudo apt-get update"],
    cli: "sudo apt-get install netbird",
    // The package declares its libgtk-3-0, libwebkit2gtk-4.1-0 and xdg-utils
    // dependencies, so apt pulls those in on its own.
    desktopApp: ["sudo apt-get install netbird-ui"],
    note: "For releases without WebKitGTK 6.0, which get a GTK3 build of the desktop app. On Ubuntu it needs the universe component, which the repository step enables. On Ubuntu 24.04 or Debian 13 and newer use the Debian / Ubuntu (APT) option instead.",
  },
  {
    label: "Fedora (DNF)",
    value: "fedora",
    repository: YUM_REPOSITORY,
    cli: "sudo dnf install netbird",
    desktopApp: ["sudo dnf install netbird-ui gtk4 webkitgtk6.0 xdg-utils"],
    note: "The desktop app needs Fedora 43 and newer. On earlier releases install the CLI only.",
  },
  {
    label: "RHEL / AlmaLinux / Rocky (DNF)",
    value: "rhel",
    repository: YUM_REPOSITORY,
    cli: "sudo dnf install netbird",
    // WebKitGTK 6.0 ships in EPEL rather than the base repositories, so the
    // desktop app path enables it first. CLI-only users do not need it.
    desktopApp: [
      "sudo dnf install epel-release -y",
      "sudo dnf install netbird-ui gtk4 webkitgtk6.0 xdg-utils",
    ],
    note: "The desktop app needs version 10 or newer with EPEL enabled, which provides WebKitGTK 6.0. On version 9 install the CLI only.",
  },
  {
    // Legacy GTK3 / WebKit2GTK 4.1 build, served from the yum-gtk3 path.
    label: "RHEL 9 / AlmaLinux 9 / Rocky 9 (DNF)",
    value: "rhel-gtk3",
    repository: YUM_GTK3_REPOSITORY,
    cli: "sudo dnf install netbird",
    // The package declares its gtk3, webkit2gtk4.1 and xdg-utils dependencies,
    // but WebKit2GTK 4.1 lives in EPEL rather than the base repositories.
    desktopApp: [
      "sudo dnf install epel-release -y",
      "sudo dnf install netbird-ui",
    ],
    note: "For version 9, which does not ship WebKitGTK 6.0 and gets a GTK3 build of the desktop app. EPEL provides WebKit2GTK 4.1. On version 10 and newer use the RHEL / AlmaLinux / Rocky (DNF) option instead.",
  },
  {
    label: "openSUSE (Zypper)",
    value: "opensuse",
    // Zypper does not read gpgkey= from a .repo file, so the repository key is
    // imported by an explicit refresh instead of the YUM_REPOSITORY snippet.
    repository: [
      "sudo zypper --non-interactive addrepo -f -g https://pkgs.netbird.io/yum/ netbird",
      "sudo zypper --gpg-auto-import-keys refresh netbird",
    ],
    cli: "sudo zypper install netbird",
    desktopApp: [
      "sudo zypper install netbird-ui libgtk-4-1 libwebkitgtk-6_0-4 xdg-utils",
    ],
    note: "The desktop app needs Tumbleweed or Leap 15.6 and newer. On earlier releases install the CLI only.",
  },
  {
    label: "Amazon Linux (YUM)",
    value: "amazon",
    repository: YUM_REPOSITORY,
    cli: "sudo yum install netbird",
    note: "Amazon Linux does not ship GTK 4 or WebKitGTK 6.0, so only the CLI is available.",
  },
];

export default function LinuxTab({
  setupKey,
  setupKeyContent,
  setupKeyPlaceholder,
  showSetupKeyInfo = false,
  hostname,
}: Readonly<Props>) {
  const [distroValue, setDistroValue] = useState(DISTROS[0].value);
  const distro =
    DISTROS.find((option) => option.value === distroValue) ?? DISTROS[0];

  const runStep = setupKeyContent ? 3 : 2;
  const usingSetupKey = !!setupKey || !!setupKeyPlaceholder;

  const hasDesktopApp = !!distro.desktopApp?.length;
  const installLines = [
    ...(distro.beforeInstall ?? []),
    distro.cli,
    ...(distro.desktopApp ?? []),
  ];

  return (
    <TabsContent value={String(OperatingSystem.LINUX)}>
      <TabsContentPadding>
        <p className={"font-medium flex gap-3 items-center text-base"}>
          <TerminalSquareIcon size={16} />
          Install with Command-line
        </p>
        <Steps>
          <Steps.Step step={1}>
            <Code>curl -fsSL https://pkgs.netbird.io/install.sh | sh</Code>
          </Steps.Step>
          {setupKeyContent && (
            <Steps.Step step={2}>{setupKeyContent}</Steps.Step>
          )}
          <Steps.Step step={runStep} line={false}>
            <p>
              Run NetBird {!usingSetupKey && "and log in the browser"}
              {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
            </p>
            <NetBirdUpCommand
              setupKey={setupKey}
              setupKeyPlaceholder={setupKeyPlaceholder}
              hostname={hostname}
            />
          </Steps.Step>
        </Steps>
      </TabsContentPadding>
      <Separator />
      <TabsContentPadding>
        <Accordion type="single" collapsible>
          <AccordionItem value="item-1">
            <AccordionTrigger>
              <PackageIcon size={16} />
              Install manually with a package manager
            </AccordionTrigger>
            <AccordionContent>
              <div className={"mt-1"}>
                <SelectDropdown
                  value={distroValue}
                  className={"w-[280px]"}
                  onChange={setDistroValue}
                  placeholder={"Select distribution"}
                  options={DISTROS.map(({ label, value }) => ({
                    label,
                    value,
                  }))}
                  data-testid={"linux-distro-select"}
                />
              </div>
              <Steps>
                <Steps.Step step={1}>
                  <p>Add our repository</p>
                  <Code codeToCopy={distro.repository.join("\n")}>
                    {distro.repository.map((line) => (
                      <Code.Line key={line}>{line}</Code.Line>
                    ))}
                  </Code>
                </Steps.Step>
                <Steps.Step step={2}>
                  <p>Install NetBird</p>
                  <Code codeToCopy={installLines.join("\n")}>
                    {distro.beforeInstall?.map((line) => (
                      <Code.Line key={line}>{line}</Code.Line>
                    ))}
                    {hasDesktopApp && (
                      <Code.Comment># for CLI only</Code.Comment>
                    )}
                    <Code.Line>{distro.cli}</Code.Line>
                    {hasDesktopApp && (
                      <>
                        <Code.Comment># for the desktop app</Code.Comment>
                        {distro.desktopApp?.map((line) => (
                          <Code.Line key={line}>{line}</Code.Line>
                        ))}
                      </>
                    )}
                  </Code>
                  <Callout variant={"info"} className={"mt-1"}>
                    {distro.note}
                    {hasDesktopApp &&
                      " Desktop app packages are available for x86_64 only."}
                  </Callout>
                </Steps.Step>
                <Steps.Step step={3} line={false}>
                  <p>
                    Run NetBird {!usingSetupKey && "and log in the browser"}
                    {showSetupKeyInfo && <RoutingPeerSetupKeyInfo />}
                  </p>
                  <NetBirdUpCommand
                    setupKey={setupKey}
                    setupKeyPlaceholder={setupKeyPlaceholder}
                    hostname={hostname}
                  />
                </Steps.Step>
              </Steps>
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </TabsContentPadding>
    </TabsContent>
  );
}
