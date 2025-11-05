import { GroupIssued } from "@/interfaces/Group";

type Props = {
  id?: string;
  issued?: string;
};

export const useGroupIdentification = ({ id, issued }: Props) => {
  const isJWTGroup = issued === GroupIssued.JWT;
  const isOktaGroup = !!id?.includes("okta");
  const isGoogleGroup = !!id?.includes("google");
  const isAzureGroup = !!id?.includes("azure");

  const isRegularGroup =
    !isJWTGroup && !isOktaGroup && !isGoogleGroup && !isAzureGroup;

  const isIntegrationGroup = isOktaGroup || isGoogleGroup || isAzureGroup;

  return {
    isOktaGroup,
    isGoogleGroup,
    isAzureGroup,
    isJWTGroup,
    isRegularGroup,
    isIntegrationGroup,
  };
};
