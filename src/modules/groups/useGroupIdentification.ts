import { GroupIssued } from "@/interfaces/Group";

type Props = {
  id?: string;
  issued?: string;
};

export const useGroupIdentification = ({ id, issued }: Props) => {
  const isOktaGroup = !!id?.includes("okta");
  const isGoogleGroup = !!id?.includes("google");
  const isAzureGroup = !!id?.includes("azure");
  const isJumpcloudGroup = !!id?.includes("jumpcloud");
  const isOIDCGroup = !!id?.includes("oidc");

  const isJWTGroup = issued === GroupIssued.JWT;
  const isIntegrationGroup = issued === GroupIssued.INTEGRATION;
  const isRegularGroup = issued === GroupIssued.API || isJWTGroup;

  return {
    isOktaGroup,
    isGoogleGroup,
    isAzureGroup,
    isJWTGroup,
    isRegularGroup,
    isJumpcloudGroup,
    isOIDCGroup,
    isIntegrationGroup,
  };
};
