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
  {
    label: "Search Engines (Google, Bing etc.)",
    value: "Search Engines (Google, Bing etc.)",
  },
  {
    label: "Coworker or Friend",
    value: "Coworker or Friend",
  },
  {
    label: "Trade Show or Event",
    value: "Trade Show or Event",
  },
  {
    label: "Blogs",
    value: "Blogs",
  },
  {
    label: "Comparison Sites",
    value: "Comparison Sites",
  },
  {
    label: "Slack",
    value: "Slack",
  },
  {
    label: "Other",
    value: "Other",
  },
  {
    label: "NetBird YouTube Channel",
    value: "NetBird YouTube Channel",
  },
  {
    label: "Other YouTube Channel",
    value: "Other YouTube Channel",
  },
  {
    label: "NetBird SubReddit",
    value: "NetBird SubReddit",
  },
  {
    label: "Other Reddit Thread",
    value: "Other Reddit Thread",
  },
  {
    label: "GitHub",
    value: "GitHub",
  },
];

export const OnboardingSurvey = ({ domainCategory, onSubmit }: Props) => {
  const { oidcUser: user } = useOidcUser();
  const name = user?.given_name || user?.name || user?.preferred_username;
  const welcomeMessage = name
    ? `Welcome to NetBird, ${name}!`
    : "Welcome to NetBird!";

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
    return referralSourceOptions.sort(() => Math.random() - 0.5);
  }, []);

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
          Share a few details about your use case to help us get you started
          smoothly.
        </div>
        <div className={"flex flex-col mt-8 z-0 gap-8"}>
          <SegmentedTabs
            value={personalOrBusiness}
            onChange={setPersonalOrBusiness}
          >
            <SegmentedTabs.List className={"rounded-lg border"}>
              <SegmentedTabs.Trigger value={"business"}>
                <BriefcaseIcon size={16} />
                Business
              </SegmentedTabs.Trigger>
              <SegmentedTabs.Trigger value={"personal"}>
                <UserIcon size={16} />
                Personal
              </SegmentedTabs.Trigger>
            </SegmentedTabs.List>
          </SegmentedTabs>

          {personalOrBusiness === "business" && (
            <div className={"flex w-full flex-col gap-2"}>
              <div>
                <Label>
                  How many people in your company will use NetBird?
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
              How did you hear about NetBird?
              <RequiredAsterisk />
            </Label>
            <SelectDropdown
              value={referralSource}
              onChange={setReferralSource}
              options={randomizedOptions}
              showValues={false}
              placeholder={"Please select an option..."}
              variant={"dropdown"}
            />
          </div>

          <div className={"flex w-full flex-col gap-2"}>
            <div>
              <Label>
                How do you plan to use NetBird?
                <RequiredAsterisk />
              </Label>
              <HelpText className={"mt-1.5"}>
                You can also select multiple use cases.
              </HelpText>
            </div>

            <div className={"flex flex-col gap-3"}>
              {isBusiness ? (
                <>
                  <OnboardingCheckbox value={zeroTrust} setValue={setZeroTrust}>
                    <ShieldCheck size={16} />
                    Zero Trust Security
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={remoteAccess}
                    setValue={setRemoteAccess}
                  >
                    <Laptop size={16} />
                    Employee Remote Access
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={businessVPN}
                    setValue={setBusinessVPN}
                  >
                    <BriefcaseIcon size={16} />
                    Business VPN
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={siteToSite}
                    setValue={setSiteToSite}
                  >
                    <Layers size={16} />
                    Site-to-Site Connectivity
                  </OnboardingCheckbox>
                  <OnboardingCheckbox value={ioT} setValue={setIoT}>
                    <Waypoints size={16} />
                    IoT (Internet of Things)
                  </OnboardingCheckbox>
                  <OnboardingCheckbox value={msp} setValue={setMsp}>
                    <Server size={15} />
                    MSP (Managed Service Provider)
                  </OnboardingCheckbox>
                </>
              ) : (
                <>
                  <OnboardingCheckbox value={homelab} setValue={setHomelab}>
                    <HomeIcon size={16} />
                    Homelab Automation
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={homeRemoteAccess}
                    setValue={setHomeRemoteAccess}
                  >
                    <Laptop size={16} />
                    Home Remote Access
                  </OnboardingCheckbox>
                  <OnboardingCheckbox
                    value={fileAccess}
                    setValue={setFileAccess}
                  >
                    <FolderIcon size={16} />
                    File Access
                  </OnboardingCheckbox>
                  <OnboardingCheckbox value={gaming} setValue={setGaming}>
                    <Gamepad2 size={16} />
                    Gaming
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
                  Other (Please specify)
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
                    ? "e.g. DNS Management, File Access"
                    : "e.g. DNS Management, IoT"
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
        Continue
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
