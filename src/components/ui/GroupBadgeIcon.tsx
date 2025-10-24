import { FolderGit2 } from "lucide-react";
import * as React from "react";
import EntraIcon from "@/assets/icons/EntraIcon";
import GoogleIcon from "@/assets/icons/GoogleIcon";
import JWTIcon from "@/assets/icons/JWTIcon";
import OktaIcon from "@/assets/icons/OktaIcon";
import { useGroups } from "@/contexts/GroupsProvider";
import { GroupIssued } from "@/interfaces/Group";
import { useGroupIdentification } from "@/modules/groups/useGroupIdentification";

export const GroupBadgeIcon = ({
  id,
  issued,
  size = 12,
}: {
  id?: string;
  issued?: GroupIssued;
  size?: number;
}) => {
  const { groups } = useGroups();
  const group = groups?.find((g) => g.id === id);

  const { isAzureGroup, isGoogleGroup, isOktaGroup, isJWTGroup } =
    useGroupIdentification({ id, issued: issued ?? group?.issued });

  if (isGoogleGroup)
    return <GoogleIcon size={size - 1} className={"shrink-0 mr-0.5"} />;
  if (isAzureGroup)
    return <EntraIcon size={size + 1} className={"shrink-0 mr-0.5"} />;
  if (isOktaGroup)
    return <OktaIcon size={size - 1} className={"shrink-0 mr-0.5"} />;
  if (isJWTGroup) return <JWTIcon size={size} className={"shrink-0"} />;

  return <FolderGit2 size={size} className={"shrink-0"} />;
};
