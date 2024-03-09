import { cn } from "@utils/helpers";
import {
  ArrowLeftRight,
  Blocks,
  Cog,
  FolderGit2,
  Globe,
  HelpCircleIcon,
  KeyRound,
  LogIn,
  MonitorSmartphoneIcon,
  NetworkIcon,
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

export default function ActivityTypeIcon({
  code,
  size = 18,
  className,
}: Props) {
  if (code.startsWith("peer")) {
    return (
      <MonitorSmartphoneIcon
        size={size}
        className={cn(DEFAULT_CLASSES, className)}
      />
    );
  } else if (code.startsWith("user")) {
    return <User size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("account")) {
    return <User size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("rule")) {
    return (
      <ArrowLeftRight size={size} className={cn(DEFAULT_CLASSES, className)} />
    );
  } else if (code.startsWith("policy")) {
    return <Shield size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("setupkey")) {
    return <KeyRound size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("group")) {
    return (
      <FolderGit2 size={size} className={cn(DEFAULT_CLASSES, className)} />
    );
  } else if (code.startsWith("route")) {
    return (
      <NetworkIcon size={size} className={cn(DEFAULT_CLASSES, className)} />
    );
  } else if (code.startsWith("dns")) {
    return <Globe size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("nameserver")) {
    return <Server size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("dashboard")) {
    return <LogIn size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("integration")) {
    return <Blocks size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("account")) {
    return <User size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("personal")) {
    return <User size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("service")) {
    return <Cog size={size} className={cn(DEFAULT_CLASSES, className)} />;
  } else if (code.startsWith("posture")) {
    return (
      <ShieldCheck size={size} className={cn(DEFAULT_CLASSES, className)} />
    );
  } else {
    return (
      <HelpCircleIcon size={size} className={cn(DEFAULT_CLASSES, className)} />
    );
  }
}
