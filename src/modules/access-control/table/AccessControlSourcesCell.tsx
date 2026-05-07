import { Policy } from "@/interfaces/Policy";
import AccessControlRuleEndpointCell from "@/modules/access-control/table/AccessControlRuleEndpointCell";

type Props = {
  policy: Policy;
  hideEdit?: boolean;
  disableRedirect?: boolean;
};

export default function AccessControlSourcesCell({
  policy,
  hideEdit = false,
  disableRedirect = false,
}: Props) {
  return (
    <AccessControlRuleEndpointCell
      policy={policy}
      endpoint="sources"
      hideEdit={hideEdit}
      disableRedirect={disableRedirect}
    />
  );
}
