import { useEffect, useMemo, useReducer, useRef } from "react";
import { Label } from "@components/Label";
import HelpText from "@components/HelpText";
import Button from "@components/Button";
import { Input } from "@components/Input";
import cidr from "ip-cidr";
import {
  FlagIcon,
  MinusCircleIcon,
  NetworkIcon,
  PlusIcon,
  ShieldCheckIcon,
  ShieldXIcon,
  WorkflowIcon,
} from "lucide-react";
import {
  SelectDropdown,
  SelectOption,
} from "@components/select/SelectDropdown";
import { CountrySelector } from "@/components/ui/CountrySelector";
import { AccessRestrictions } from "@/interfaces/ReverseProxy";

type AccessAction = "allow" | "block";
type AccessRuleType = "country" | "ip" | "cidr";

const ACTION_OPTIONS: SelectOption[] = [
  {
    label: "Allow Only",
    value: "allow",
    icon: (props) => <ShieldCheckIcon {...props} className="text-green-500" />,
  },
  {
    label: "Block Only",
    value: "block",
    icon: (props) => <ShieldXIcon {...props} className="text-red-500" />,
  },
];

const TYPE_OPTIONS: SelectOption[] = [
  {
    label: "Country",
    value: "country",
    icon: (props) => <FlagIcon {...props} />,
  },
  {
    label: "IP Address",
    value: "ip",
    icon: (props) => <WorkflowIcon {...props} />,
  },
  {
    label: "CIDR Block",
    value: "cidr",
    icon: (props) => <NetworkIcon {...props} />,
  },
];

type AccessRule = {
  id: string;
  action: AccessAction;
  type: AccessRuleType;
  value: string;
};

type RulesAction =
  | { type: "add" }
  | { type: "remove"; id: string }
  | {
      type: "update";
      id: string;
      field: "action" | "type" | "value";
      value: string;
    };

const nextId = () => crypto.randomUUID();

function rulesReducer(state: AccessRule[], action: RulesAction): AccessRule[] {
  switch (action.type) {
    case "add":
      return [
        ...state,
        { id: nextId(), action: "allow", type: "country", value: "" },
      ];
    case "remove":
      return state.filter((r) => r.id !== action.id);
    case "update":
      return state.map((r) => {
        if (r.id !== action.id) return r;
        if (action.field === "type") {
          return { ...r, type: action.value as AccessRuleType, value: "" };
        }
        return { ...r, [action.field]: action.value };
      });
  }
}

function restrictionsToRules(
  restrictions: AccessRestrictions | undefined,
): AccessRule[] {
  if (!restrictions) return [];
  const rules: AccessRule[] = [];
  restrictions.allowed_countries?.forEach((v) =>
    rules.push({ id: nextId(), action: "allow", type: "country", value: v }),
  );
  restrictions.blocked_countries?.forEach((v) =>
    rules.push({ id: nextId(), action: "block", type: "country", value: v }),
  );
  restrictions.allowed_cidrs?.forEach((v) => {
    const isIp = v.endsWith("/32");
    rules.push({ id: nextId(), action: "allow", type: isIp ? "ip" : "cidr", value: isIp ? v.replace(/\/32$/, "") : v });
  });
  restrictions.blocked_cidrs?.forEach((v) => {
    const isIp = v.endsWith("/32");
    rules.push({ id: nextId(), action: "block", type: isIp ? "ip" : "cidr", value: isIp ? v.replace(/\/32$/, "") : v });
  });
  return rules;
}

function rulesToRestrictions(
  rules: AccessRule[],
): AccessRestrictions | undefined {
  const allowed_countries: string[] = [];
  const blocked_countries: string[] = [];
  const allowed_cidrs: string[] = [];
  const blocked_cidrs: string[] = [];

  for (const rule of rules) {
    if (!rule.value) continue;
    if (rule.type === "country") {
      if (rule.action === "allow") allowed_countries.push(rule.value);
      else blocked_countries.push(rule.value);
    } else {
      const value = rule.type === "ip" && !rule.value.includes("/") ? `${rule.value}/32` : rule.value;
      if (rule.action === "allow") allowed_cidrs.push(value);
      else blocked_cidrs.push(value);
    }
  }

  const hasAny =
    allowed_countries.length > 0 ||
    blocked_countries.length > 0 ||
    allowed_cidrs.length > 0 ||
    blocked_cidrs.length > 0;

  if (!hasAny) return undefined;

  return {
    ...(allowed_countries.length > 0 && { allowed_countries }),
    ...(blocked_countries.length > 0 && { blocked_countries }),
    ...(allowed_cidrs.length > 0 && { allowed_cidrs }),
    ...(blocked_cidrs.length > 0 && { blocked_cidrs }),
  };
}

type Props = {
  value: AccessRestrictions | undefined;
  onChange: (value: AccessRestrictions | undefined) => void;
  onValidationChange?: (hasErrors: boolean) => void;
};

function validateRule(rule: AccessRule): string {
  if (rule.type === "country" || !rule.value) return "";
  if (rule.type === "ip") {
    const val = rule.value.includes("/") ? rule.value : `${rule.value}/32`;
    if (!cidr.isValidAddress(val)) {
      return "Please enter a valid IP address, e.g., 85.203.15.42";
    }
  } else {
    if (!rule.value.includes("/") || !cidr.isValidAddress(rule.value)) {
      return "Please enter a valid CIDR block, e.g., 74.125.0.0/16";
    }
  }
  return "";
}

export const ReverseProxyAccessControlRules = ({ value, onChange, onValidationChange }: Props) => {
  const [rules, dispatch] = useReducer(
    rulesReducer,
    value,
    restrictionsToRules,
  );

  const errors = useMemo(
    () => Object.fromEntries(rules.map((r) => [r.id, validateRule(r)])),
    [rules],
  );

  const hasErrors = useMemo(
    () => Object.values(errors).some((e) => e !== ""),
    [errors],
  );

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const onValidationChangeRef = useRef(onValidationChange);
  onValidationChangeRef.current = onValidationChange;

  useEffect(() => {
    onChangeRef.current(rulesToRestrictions(rules));
  }, [rules]);

  useEffect(() => {
    onValidationChangeRef.current?.(hasErrors);
  }, [hasErrors]);

  return (
    <div className={"flex-col flex"}>
      <div>
        <Label>Access Control Rules</Label>
        <HelpText>
          Define rules to allow or block traffic based on country, IP address,
          or CIDR block.
          <br />
          Block rules always take priority over allow rules.
        </HelpText>
      </div>
      {rules.length > 0 && (
        <div className="flex flex-col gap-3 mt-1 mb-4">
          {rules.map((rule) => (
            <div key={rule.id} className="flex items-center">
              <div className="w-[160px] shrink-0 [&_button]:rounded-r-none [&_button]:w-[160px]">
                <SelectDropdown
                  value={rule.action}
                  onChange={(v) =>
                    dispatch({
                      type: "update",
                      id: rule.id,
                      field: "action",
                      value: v,
                    })
                  }
                  options={ACTION_OPTIONS}
                  compact
                />
              </div>

              <div className="w-[160px] shrink-0 -ml-px [&_button]:rounded-none [&_button]:w-[160px]">
                <SelectDropdown
                  value={rule.type}
                  onChange={(v) =>
                    dispatch({
                      type: "update",
                      id: rule.id,
                      field: "type",
                      value: v,
                    })
                  }
                  options={TYPE_OPTIONS}
                  compact
                />
              </div>

              <div className="flex-1 min-w-0 -ml-px [&_button]:rounded-l-none [&_input]:rounded-l-none">
                {rule.type === "country" ? (
                  <CountrySelector
                    iconSize={16}
                    popoverWidth={350}
                    truncate
                    value={rule.value}
                    onChange={(v) =>
                      dispatch({
                        type: "update",
                        id: rule.id,
                        field: "value",
                        value: v,
                      })
                    }
                  />
                ) : (
                  <Input
                    placeholder={
                      rule.type === "ip"
                        ? "e.g., 85.203.15.42"
                        : "e.g., 74.125.0.0/16"
                    }
                    value={rule.value}
                    onChange={(e) =>
                      dispatch({
                        type: "update",
                        id: rule.id,
                        field: "value",
                        value: e.target.value,
                      })
                    }
                    error={errors[rule.id]}
                    errorTooltip={true}
                    maxWidthClass="w-full"
                  />
                )}
              </div>

              <Button
                variant="default-outline"
                className="h-[42px] w-[42px] !px-0 shrink-0 ml-2"
                onClick={() => dispatch({ type: "remove", id: rule.id })}
                aria-label="Remove rule"
              >
                <MinusCircleIcon size={14} />
              </Button>
            </div>
          ))}
        </div>
      )}
      <Button
        variant="dotted"
        className="w-full"
        size="sm"
        onClick={() => dispatch({ type: "add" })}
      >
        <PlusIcon size={14} />
        Add Rule
      </Button>
    </div>
  );
};
