import { cn } from "@utils/helpers";
import {
  ArrowLeftRight,
  Blocks,
  Cog,
  CreditCardIcon,
  FolderGit2,
  Globe,
  HelpCircleIcon,
  KeyRound,
  Layers3Icon,
  LogIn,
  type LucideIcon,
  MonitorSmartphoneIcon,
  NetworkIcon,
  RefreshCcw,
  Server,
  Shield,
  ShieldCheck,
  User,
} from "lucide-react";
import React from "react";

type Props = {
  code: string;
  size?: number;
  className?: string;
};

const DEFAULT_CLASSES = "shrink-0";

type ActivityTypeKey = keyof typeof ActivityTypeMappings;

const ActivityTypeMappings = {
  peer: MonitorSmartphoneIcon,
  user: User,
  account: Cog,
  rule: ArrowLeftRight,
  policy: Shield,
  setupkey: KeyRound,
  group: FolderGit2,
  route: NetworkIcon,
  dns: Globe,
  nameserver: Server,
  dashboard: LogIn,
  integration: Blocks,
  personal: User,
  service: Cog,
  billing: CreditCardIcon,
  integrated: ShieldCheck,
  posture: ShieldCheck,
  transferred: RefreshCcw,
  resource: Layers3Icon,
  network: NetworkIcon,
} as const satisfies Record<string, LucideIcon>;

export default function ActivityTypeIcon({
  code,
  size = 18,
  className,
}: Props) {
  const prefixParts = code?.split(".") || [];
  const prefix = (prefixParts[0] || "").toLowerCase();

  // Check if prefix is a valid key, otherwise use fallback
  const Icon =
    prefix in ActivityTypeMappings
      ? ActivityTypeMappings[prefix as ActivityTypeKey]
      : HelpCircleIcon;

  return <Icon size={size} className={cn(DEFAULT_CLASSES, className)} />;
}
