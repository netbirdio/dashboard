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
  BotIcon,
  BriefcaseIcon,
  CoinsIcon,
  GaugeIcon,
  ScrollTextIcon,
  UserIcon,
  UsersIcon,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { HubspotFormField } from "@/contexts/AnalyticsProvider";
import { useLoggedInUser } from "@/contexts/UsersProvider";
import {
  companySizes,
  referralSourceOptions,
} from "@/modules/onboarding/OnboardingSurvey";

type Props = {
  onSubmit: (fields: HubspotFormField[]) => void;
};

// Agent-Network-specific use cases. Unlike the cloud survey (VPN use cases),
// these describe what an operator wants Agent Network to do. The `value` is the
// label and the string sent to HubSpot's `use_case` field.
const USE_CASES: { value: string; icon: React.ReactNode }[] = [
  { value: "Employee access to LLMs", icon: <UsersIcon size={16} /> },
  { value: "Autonomous agent access", icon: <BotIcon size={16} /> },
  { value: "Token & budget limits", icon: <GaugeIcon size={16} /> },
  { value: "Usage & cost attribution", icon: <CoinsIcon size={16} /> },
  { value: "Audit & access logging for AI", icon: <ScrollTextIcon size={16} /> },
];

// AgentNetworkSignupForm is the self-hosted Agent Network signup form. It runs
// as the first step of the Agent Network onboarding (like the cloud survey is
// step 1 of cloud onboarding), so it renders just the form content — the
// onboarding shell (modal, logo, card, stepper) is provided by the parent. It
// mirrors the cloud survey's HubSpot field shape but drops the JWT-derived
// domain field (self-hosted IdPs don't emit it) and asks Agent-Network use
// cases.
export const AgentNetworkSignupForm = ({ onSubmit }: Props) => {
  const { oidcUser: user } = useOidcUser();
  const { loggedInUser } = useLoggedInUser();
  const name = user?.given_name || user?.name || user?.preferred_username;
  const welcomeMessage = name
    ? `Welcome to NetBird, ${name}!`
    : "Welcome to NetBird!";

  const defaultEmail = loggedInUser?.email || user?.email || "";
  const [email, setEmail] = useState(defaultEmail);
  // Prefill the email once the user/profile resolves (OIDC can lag the first
  // render), without clobbering an edit the operator already made.
  useEffect(() => {
    if (!email && defaultEmail) setEmail(defaultEmail);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultEmail]);

  const [personalOrBusiness, setPersonalOrBusiness] = useState("business");
  const isBusiness = personalOrBusiness === "business";
  const [companySize, setCompanySize] = useState<string>("");
  const [referralSource, setReferralSource] = useState("");
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [other, setOther] = useState(false);
  const [otherUseCase, setOtherUseCase] = useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  const toggle = (value: string) =>
    setSelected((prev) => ({ ...prev, [value]: !prev[value] }));

  const getUseCases = () => {
    const picked = USE_CASES.filter((u) => selected[u.value]).map(
      (u) => u.value,
    );
    if (other && otherUseCase) picked.push(otherUseCase);
    return picked.join(", ");
  };

  const hasSelectedUseCase = useMemo(
    () => USE_CASES.some((u) => selected[u.value]) || (other && otherUseCase !== ""),
    [selected, other, otherUseCase],
  );

  const randomizedOptions = useMemo(
    () => referralSourceOptions.sort(() => Math.random() - 0.5),
    [],
  );

  const canSubmit = useMemo(() => {
    const base = email !== "" && hasSelectedUseCase && referralSource !== "";
    return isBusiness ? base && companySize !== "" : base;
  }, [email, hasSelectedUseCase, referralSource, isBusiness, companySize]);

  const submitForm = () => {
    let fields: HubspotFormField[] = [];
    try {
      if (loggedInUser || user) {
        fields = [
          { name: "email", value: email },
          { name: "is_company", value: isBusiness ? "Business" : "Personal" },
          { name: "use_case", value: getUseCases() },
          {
            name: "how_did_you_hear_about_us",
            value: referralSource || "Other",
          },
          { name: "account_category", value: isBusiness ? "business" : "personal" },
        ];
        if (isBusiness && companySize !== "") {
          fields.push({ name: "planned_users", value: companySize });
        }
      }
    } catch (e) {}
    onSubmit(fields);
  };

  return (
    <>
      <div className={"relative"}>
        <h1 className={"text-xl text-center"}>{welcomeMessage}</h1>
        <div
          className={
            "text-sm text-nb-gray-300 font-light mt-2 block text-center max-w-md mx-auto px-6"
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

          <div className={"flex w-full flex-col gap-2"}>
            <Label>
              Email
              <RequiredAsterisk />
            </Label>
            <Input
              type={"email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={"you@company.com"}
            />
          </div>

          {isBusiness && (
            <div className={"flex w-full flex-col gap-2"}>
              <Label>
                How many people in your company will use NetBird?
                <RequiredAsterisk />
              </Label>
              <ButtonGroup>
                {companySizes.map((size) => (
                  <ButtonGroup.Button
                    key={size.value}
                    className={"w-full"}
                    onClick={() => setCompanySize(size.value)}
                    variant={
                      companySize === size.value ? "tertiary" : "secondary"
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
                How do you plan to use Agent Network?
                <RequiredAsterisk />
              </Label>
              <HelpText className={"mt-1.5"}>
                You can also select multiple use cases.
              </HelpText>
            </div>

            <div className={"flex flex-col gap-3"}>
              {USE_CASES.map((u) => (
                <SignupCheckbox
                  key={u.value}
                  value={!!selected[u.value]}
                  setValue={() => toggle(u.value)}
                >
                  {u.icon}
                  {u.value}
                </SignupCheckbox>
              ))}

              <label
                className={
                  "text-neutral-500 dark:text-nb-gray-300 font-normal flex items-center gap-4 cursor-pointer"
                }
              >
                <Checkbox
                  checked={other}
                  onCheckedChange={() => {
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

            <div className={cn(!other && "!h-0 opacity-0", "mt-2", other && "mb-3")}>
              <Input
                ref={inputRef}
                placeholder={"e.g. Internal RAG service, MCP tools"}
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

const SignupCheckbox = ({
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
