import Badge from "@components/Badge";
import {
  Binary,
  FileCode2Icon,
  Flag,
  GlobeOff,
  Mail,
  Network,
  RectangleEllipsis,
  Users,
} from "lucide-react";
import * as React from "react";
import { ReverseProxyEvent } from "@/interfaces/ReverseProxy";

type Props = {
  event: ReverseProxyEvent;
};

export const ReverseProxyEventsAuthMethodCell = ({ event }: Props) => {
  const authMethod = event.auth_method_used;

  if (!authMethod) {
    return <span className="text-nb-gray-400 text-sm px-3 py-2">-</span>;
  }

  const getAuthMethodDisplay = () => {
    switch (authMethod.toLowerCase()) {
      case "oidc":
      case "sso":
      case "bearer":
        return {
          icon: <Users size={12} />,
          label: "SSO",
        };
      case "password":
        return {
          icon: <RectangleEllipsis size={12} />,
          label: "Password",
        };
      case "pin":
        return {
          icon: <Binary size={12} />,
          label: "PIN Code",
        };
      case "header":
        return {
          icon: <FileCode2Icon size={12} />,
          label: "HTTP Headers",
        };
      case "link":
      case "magic_link":
      case "magic-link":
        return {
          icon: <Mail size={12} />,
          label: "Magic Link",
        };
      case "ip_restricted":
        return {
          icon: <Network size={12} />,
          label: "IP Restricted",
        };
      case "country_restricted":
        return {
          icon: <Flag size={12} />,
          label: "Country Restricted",
        };
      case "geo_unavailable":
        return {
          icon: <GlobeOff size={12} />,
          label: "Geo Unavailable",
        };
      default:
        return {
          icon: null,
          label: authMethod,
        };
    }
  };

  const { icon, label } = getAuthMethodDisplay();

  return (
    <div className="px-3 py-2">
      <Badge variant="gray" className="gap-1.5">
        {icon}
        {label}
      </Badge>
    </div>
  );
};
