import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import ButtonGroup from "@components/ButtonGroup";
import { Checkbox } from "@components/Checkbox";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { SegmentedTabs } from "@components/SegmentedTabs";
import { SelectDropdown } from "@components/select/SelectDropdown";
import { cn } from "@utils/helpers";
import {
  BriefcaseIcon,
  FolderIcon,
  Gamepad2,
  HomeIcon,
  Laptop,
  Layers,
  Server,
  ShieldCheck,
  UserIcon,
  Waypoints,
} from "lucide-react";
import React, { useMemo, useState } from "react";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import { HubspotFormField } from "@/contexts/AnalyticsProvider";
import { useI18n } from "@/i18n/I18nProvider";

type Props = {
  domainCategory: string;
  onSubmit?: (fields: HubspotFormField[]) => void;
};

export const companySizes = [
  {
    label: "1-5",
    value: "1",
  },
  {
    label: "5-50",
    value: "5",
  },
  {
    label: "50-300",
    value: "50",
  },
  {
    label: "300-1000",
    value: "300",
  },
  {
    label: "1000+",
    value: "1000",
  },
];

export const referralSourceOptions = [
  "Search Engines (Google, Bing etc.)",
  "Coworker or Friend",
  "Trade Show or Event",
  "Blogs",
  "Comparison Sites",
  "Slack",
  "Other",
  "NetBird YouTube Channel",
  "Other YouTube Channel",
  "NetBird SubReddit",
  "Other Reddit Thread",
  "GitHub",
] as const;

export const OnboardingSurvey = ({ domainCategory, onSubmit }: Props) => {
  const { t } = useI18n();
  const { oidcUser: user } = useOidcUser();
  const name = user?.given_name || user?.name || user?.preferred_username;
  const welcomeMessage = name
    ? t("onboarding.welcomeWithName", { name })
    : t("onboarding.welcome");

  const isPrivate = domainCategory === "private";
  const [personalOrBusiness, setPersonalOrBusiness] = useState(
    isPrivate ? "business" : "personal",
  );
  const [companySize, setCompanySize] = useState<string>("");
  const isCompanySizeSelected = (size: string) => companySize === size;
  const isBusiness = personalOrBusiness === "business";

  const [homelab, setHomelab] = useState(false);
  const [remoteAccess, setRemoteAccess] = useState(false);
  const [homeRemoteAccess, setHomeRemoteAccess] = useState(false);
  const [fileAccess, setFileAccess] = useState(false);
  const [gaming, setGaming] = useState(false);
  const [zeroTrust, setZeroTrust] = useState(false);
  const [ioT, setIoT] = useState(false);
  const [siteToSite, setSiteToSite] = useState(false);
  const [businessVPN, setBusinessVPN] = useState(false);
  const [referralSource, setReferralSource] = useState("");
  const [msp, setMsp] = useState(false);

  const [other, setOther] = useState(false);
  const [otherUseCase, setOtherUseCase] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const { loggedInUser } = useLoggedInUser();

  const getUseCases = () => {
    const hl = homelab && !isBusiness ? "Homelab Automation" : "";
    const hra = homeRemoteAccess && !isBusiness ? "Home Remote Access" : "";
    const fa = fileAccess && !isBusiness ? "File Access" : "";
    const g = gaming && !isBusiness ? "Gaming" : "";

    const zt = zeroTrust && isBusiness ? "Zero Trust Security" : "";
    const ra = remoteAccess && isBusiness ? "Employee Remote Access" : "";
    const bv = businessVPN && isBusiness ? "Business VPN" : "";
    const st = siteToSite && isBusiness ? "Site-to-Site Connectivity" : "";
    const iot = ioT && isBusiness ? "IoT (Internet of Things)" : "";
    const mp = msp && isBusiness ? "MSP (Managed Service Provider)" : "";

    const ou = other ? otherUseCase : "";
    return [hl, hra, fa, g, zt, ra, bv, st, iot, mp, ou]
      .filter((s) => s != "")
      .join(", ");
  };

  const hasSelectedUseCase = useMemo(() => {
    if (isBusiness) {
      return (
        zeroTrust ||
        remoteAccess ||
        businessVPN ||
        siteToSite ||
        ioT ||
        msp ||
        (other && otherUseCase !== "")
      );
    } else {
      return (
        homelab ||
        homeRemoteAccess ||
        fileAccess ||
        gaming ||
        (other && otherUseCase !== "")
      );
    }
  }, [
    businessVPN,
    fileAccess,
    gaming,
    homeRemoteAccess,
    homelab,
    ioT,
    isBusiness,
    other,
    otherUseCase,
    remoteAccess,
    siteToSite,
    zeroTrust,
    msp,
  ]);

  const hasCompanySizeSelected = useMemo(() => {
    return companySize !== "";
  }, [companySize]);

  const hasHowDidYouHearAboutUsSelected = useMemo(() => {
    return referralSource !== "";
  }, [referralSource]);

  const canSubmit = useMemo(() => {
    if (isBusiness) {
      return (
        hasCompanySizeSelected &&
        hasSelectedUseCase &&
        hasHowDidYouHearAboutUsSelected
      );
    } else {
      return hasSelectedUseCase && hasHowDidYouHearAboutUsSelected;
    }
  }, [
    hasSelectedUseCase,
    isBusiness,
    hasCompanySizeSelected,
    hasHowDidYouHearAboutUsSelected,
  ]);

  const randomizedOptions = useMemo(() => {
    return [...referralSourceOptions]
      .sort(() => Math.random() - 0.5)
      .map((value) => ({
        value,
        label: t(`onboarding.referralSource.${value}`),
      }));
  }, [t]);

  const submitForm = () => {
    let fields: HubspotFormField[] = [];
    try {
      // Fallback: use OIDC user email if loggedInUser?.email is missing
      const email = loggedInUser?.email || user?.email || "";
      if (loggedInUser || user) {
        fields = [
          {
            name: "email",
            value: email,
          },
          {
            name: "is_company",
            value: personalOrBusiness === "business" ? "Business" : "Personal",
          },
          {
            name: "use_case",
            value: getUseCases(),
          },
          {
            name: "how_did_you_hear_about_us",
            value: referralSource || "Other",
          },
        ];

        let accountCategory;
        switch (personalOrBusiness) {
          case "business":
            accountCategory = "business";
            break;
          case "personal":
            accountCategory = "personal";
            break;
          default:
            accountCategory = "unknown";
        }

        fields.push({
          name: "account_category",
          value: accountCategory,
        });

        if (domainCategory) {
          if (domainCategory === "business") {
            fields.push({
              name: "0-2/domain",
              value: email.split("@")[1] || "",
            });
          }
        }

        if (personalOrBusiness === "business" && companySize !== "") {
          fields.push({
            name: "planned_users",
            value: companySize,
          });
        }
      }
    } catch (e) {}
    onSubmit?.(fields);
  };

  return (
    <>
      <div className={"relative"}>
        <h1 className={"text-xl text-center"}>{welcomeMessage}</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center max-w-md px-10"
          }
        >
          {t("onboarding.shareDetails")}
        </div>
        <div className={"flex flex-col mt-8 z-0 gap-8"}>
          <SegmentedTabs
            value={personalOrBusiness}
            onChange={setPersonalOrBusiness}
          >
            <SegmentedTabs.List className={"rounded-lg border"}>
              <SegmentedTabs.Trigger value={"business"}>
                <BriefcaseIcon size={16} />
                {t("onboarding.business")}
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value={"personal"}>
                <UserIcon size={16} />
                {t("onboarding.personal")}
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
          </SegmentedTabs>

          {personalOrBusiness === "business" && (
            <div className={"flex w-full flex-col gap-2"}>
              <div>
                <Label>
                  {t("onboarding.companySizeQuestion")}
                  <RequiredAsterisk />
                </Label>
              </div>
              <ButtonGroup>
                {companySizes.map((size) => (
                  <ButtonGroup.Button
                    key={size.value}
                    className={"w-full"}
                    onClick={() => setCompanySize(size.value)}
                    variant={
                      isCompanySizeSelected(size.value)
                        ? "tertiary"
                        : "secondary"
                    }
                  >
                    {size.label}
                  </ButtonGroup.Button>
                ))}
              </ButtonGroup>
            </div>
          )}

          <div className={"flex w-full flex-col gap-2"}>
            <Label>
              {t("onboarding.howHeardAboutNetBird")}
              <RequiredAsterisk />
            </Label>
            <SelectDropdown
              value={referralSource}
              onChange={setReferralSource}
              options={randomizedOptions}
              showValues={false}
              placeholder={t("onboarding.selectOption")}
              variant={"dropdown"}
            />
          </div>

          <div className={"flex w-full flex-col gap-2"}>
            <div>
              <Label>
                {t("onboarding.howPlanToUseNetBird")}
                <RequiredAsterisk />
              </Label>
              <HelpText className={"mt-1.5"}>
                {t("onboarding.selectMultipleUseCases")}
              </HelpText>
            </div>

            <div className={"flex flex-col gap-3"}>
              {isBusiness ? (
                <>
                  <OnboardingCheckbox value={zeroTrust} setValue={setZeroTrust}>
                    <ShieldCheck size={16} />
                    {t("onboarding.zeroTrustSecurity")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={remoteAccess}
                    setValue={setRemoteAccess}
                  >
                    <Laptop size={16} />
                    {t("onboarding.employeeRemoteAccess")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={businessVPN}
                    setValue={setBusinessVPN}
                  >
                    <BriefcaseIcon size={16} />
                    {t("onboarding.businessVPN")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={siteToSite}
                    setValue={setSiteToSite}
                  >
                    <Layers size={16} />
                    {t("onboarding.siteToSiteConnectivity")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox value={ioT} setValue={setIoT}>
                    <Waypoints size={16} />
                    {t("onboarding.iot")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox value={msp} setValue={setMsp}>
                    <Server size={15} />
                    {t("onboarding.msp")}
                  </OnboardingCheckbox>
                </>
              ) : (
                <>
                  <OnboardingCheckbox value={homelab} setValue={setHomelab}>
                    <HomeIcon size={16} />
                    {t("onboarding.homelabAutomation")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={homeRemoteAccess}
                    setValue={setHomeRemoteAccess}
                  >
                    <Laptop size={16} />
                    {t("onboarding.homeRemoteAccess")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={fileAccess}
                    setValue={setFileAccess}
                  >
                    <FolderIcon size={16} />
                    {t("onboarding.fileAccess")}
                  </OnboardingCheckbox>
                  <OnboardingCheckbox value={gaming} setValue={setGaming}>
                    <Gamepad2 size={16} />
                    {t("onboarding.gaming")}
                  </OnboardingCheckbox>
                </>
              )}

              <label
                className={
                  "text-neutral-500 dark:text-nb-gray-300 font-normal flex items-center gap-4 cursor-pointer"
                }
              >
                <Checkbox
                  checked={other}
                  onCheckedChange={(v) => {
                    setOther(!other);
                    inputRef.current?.focus();
                  }}
                />
                <div
                  className={
                    "flex items-center gap-1.5 whitespace-nowrap text-sm select-none"
                  }
                >
                  {t("onboarding.otherPleaseSpecify")}
                </div>
              </label>
            </div>

            <div
              className={cn(
                !other && "!h-0 opacity-0",
                "mt-2",
                other && "mb-3",
              )}
            >
              <Input
                ref={inputRef}
                placeholder={
                  isBusiness
                    ? t("onboarding.businessOtherPlaceholder")
                    : t("onboarding.personalOtherPlaceholder")
                }
                value={otherUseCase}
                onChange={(e) => setOtherUseCase(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      <Button
        variant={"primary"}
        className={"w-full mt-4"}
        onClick={submitForm}
        disabled={!canSubmit}
      >
        {t("actions.continue")}
      </Button>
    </>
  );
};

const OnboardingCheckbox = ({
  value,
  setValue,
  children,
}: {
  value: boolean;
  setValue: (value: boolean) => void;
  children: React.ReactNode;
}) => {
  return (
    <label
      className={
        "text-neutral-500 dark:text-nb-gray-300 font-normal flex items-center gap-4 cursor-pointer"
      }
    >
      <Checkbox checked={value} onCheckedChange={setValue} />
      <div
        className={
          "flex items-center gap-1.5 whitespace-nowrap text-sm select-none"
        }
      >
        {children}
      </div>
    </label>
  );
};

const RequiredAsterisk = () => (
  <span className={"text-red-500 relative -top-[2.5px]"}>*</span>
);
