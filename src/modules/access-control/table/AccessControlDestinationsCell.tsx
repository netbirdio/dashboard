import { Policy } from "@/interfaces/Policy";
import AccessControlRuleEndpointCell from "@/modules/access-control/table/AccessControlRuleEndpointCell";

type Props = {
  policy: Policy;
};

export default function AccessControlDestinationsCell({
  policy,
}: Readonly<Props>) {
  return (
    <AccessControlRuleEndpointCell policy={policy} endpoint="destinations" />
  );
}
