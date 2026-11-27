import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import { PlusCircle } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { Network, NetworkResource } from "@/interfaces/Network";
import { Policy, PolicyRuleResource } from "@/interfaces/Policy";
import {
  PolicyRuleFields,
  SiteToSiteScope,
} from "@/modules/access-control/PolicyRuleFields";
import { useAccessControl } from "@/modules/access-control/useAccessControl";
import { siteToSitePolicyName } from "@/modules/site-to-site/wizard/wizardSides";

type Props = {
  sourceResource: PolicyRuleResource;
  destinationResource: PolicyRuleResource;
  scope: SiteToSiteScope;
  networks?: Network[];
  resources?: NetworkResource[];
  onCreated: (policy: Policy) => void;
  footer: (actions: React.ReactNode) => React.ReactNode;
};

/**
 * The policy modal's Policy tab, limited to one network's resources on each
 * side, with the rule's name. Saving creates the policy, which is what makes
 * the two networks a connection.
 */
export const AccessStep = ({
  sourceResource,
  destinationResource,
  scope,
  networks,
  resources,
  onCreated,
  footer,
}: Props) => {
  const { permission } = usePermissions();
  const accessControl = useAccessControl({
    initialSourceResource: sourceResource,
    initialDestinationResource: destinationResource,
    initialDirection: "in",
    onSuccess: onCreated,
  });
  const [nameTouched, setNameTouched] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const side = (ref?: PolicyRuleResource) => {
    const resource = resources?.find((r) => r.id === ref?.id);
    const network = networks?.find((n) => n.resources?.includes(ref?.id ?? ""));
    return { resource, network };
  };
  const proposedName = siteToSitePolicyName(
    side(accessControl.sourceResource),
    side(accessControl.destinationResource),
  );
  const name = nameTouched ? accessControl.name : proposedName;

  const canAdd =
    !!accessControl.sourceResource &&
    !!accessControl.destinationResource &&
    !!name.trim() &&
    !!permission.policies.create &&
    !isSaving;

  const add = async () => {
    if (!canAdd) return;
    setIsSaving(true);
    try {
      await accessControl.submit({ name: name.trim() });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <div className={"px-8 flex flex-col gap-6"}>
        <PolicyRuleFields state={accessControl} siteToSiteScope={scope} />
        <div>
          <Label>Name of the Rule</Label>
          <HelpText>Set an easily identifiable name for your policy.</HelpText>
          <Input
            value={name}
            data-testid={"policy-name"}
            placeholder={"e.g., Berlin Office to AWS"}
            onChange={(e) => {
              setNameTouched(true);
              accessControl.setName(e.target.value);
            }}
          />
        </div>
      </div>
      {footer(
        <Button
          variant={"primary"}
          disabled={!canAdd}
          onClick={() => void add()}
          data-testid={"submit-policy"}
        >
          <PlusCircle size={16} />
          Add Policy
        </Button>,
      )}
    </>
  );
};
