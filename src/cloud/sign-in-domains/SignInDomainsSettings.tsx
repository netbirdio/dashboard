import Button from "@components/Button";
import { Input } from "@components/Input";
import { notify } from "@components/Notification";
import { cn, validator } from "@utils/helpers";
import { PlusCircle } from "lucide-react";
import * as React from "react";
import { useMemo, useState } from "react";
import SignInDomainsTable, {
  SignInDomainsTableSkeleton,
} from "@/cloud/sign-in-domains/table/SignInDomainsTable";
import { useSignInDomains } from "@/cloud/sign-in-domains/useSignInDomains";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { DomainValidationStatus, SignInDomain } from "@/interfaces/Account";
import { DomainVerificationModal } from "@/modules/integrations/sso/DomainVerificationModal";

// Verification finishes on the service seconds to minutes after it starts, and
// nothing pushes the new status, so the list polls while it is on screen.
const POLL_INTERVAL_MS = 15_000;

export const SignInDomainsSettings = () => {
  const { permission } = usePermissions();
  const { domains, isLoading, error, mutate, addDomain, verifyDomain } =
    useSignInDomains(POLL_INTERVAL_MS);
  const [domain, setDomain] = useState("");
  const [verifyModal, setVerifyModal] = useState(false);
  const [addedDomain, setAddedDomain] = useState<SignInDomain>();

  // Without the list there is nothing to act on, and adding blind invites a 409
  // against a domain that is already there.
  const isUnavailable = !isLoading && (!!error || !domains);
  const canUpdate = permission.settings.update && !isUnavailable;

  const validationError = useMemo(() => {
    const name = domain.trim();
    if (name === "") return "";
    const valid = validator.isValidDomain(name, {
      allowWildcard: false,
      allowOnlyTld: false,
      preventLeadingAndTrailingDots: true,
    });
    if (!valid) return "Please enter a valid domain, e.g. company.com";
    return "";
  }, [domain]);

  const addDomainHandler = async () => {
    const name = domain.trim();
    if (!name || validationError) return;
    notify({
      title: "Sign-in Domains",
      description: `${name} has been added`,
      // The refresh runs beside the toast rather than inside its promise: a
      // failed revalidation must not report the successful add as an error.
      promise: addDomain(name).then((added) => {
        setDomain("");
        // A domain that matches the caller's own email address comes back
        // already verified, so there is nothing left to prove.
        if (
          added &&
          added.validation_status !== DomainValidationStatus.VERIFIED
        ) {
          setAddedDomain(added);
          setVerifyModal(true);
        }
        mutate().catch(() => {});
        return added;
      }),
      loadingMessage: "Adding domain...",
    });
  };

  return (
    <div
      className={cn(isUnavailable && "pointer-events-none opacity-70")}
      data-testid={"sign-in-domains"}
    >
      {addedDomain && (
        <DomainVerificationModal
          open={verifyModal}
          onOpenChange={setVerifyModal}
          domain={addedDomain.name}
          token={addedDomain.validation_token}
          onVerify={() =>
            verifyDomain(addedDomain.id).then((res) => {
              mutate().catch(() => {});
              return res;
            })
          }
        />
      )}

      <form
        // items-start keeps the button at its own height: the row grows when
        // the input renders an error below it, and a stretched item would too.
        className={"flex items-start gap-4 w-full justify-between mb-6"}
        onSubmit={(e) => {
          e.preventDefault();
          addDomainHandler().then();
        }}
      >
        <div className={"w-full"}>
          <Input
            className={"w-full text-sm"}
            value={domain}
            error={validationError}
            disabled={!canUpdate}
            onChange={(e) => setDomain(e.target.value)}
            placeholder={"e.g. company.com"}
            data-testid={"add-domain-input"}
          />
        </div>
        <Button
          type={"submit"}
          variant={"primary"}
          disabled={!canUpdate || !domain.trim() || !!validationError}
          data-testid={"add-domain"}
        >
          <PlusCircle size={16} />
          Add Domain
        </Button>
      </form>

      {isLoading ? (
        <SignInDomainsTableSkeleton />
      ) : (
        <SignInDomainsTable domains={domains} />
      )}
    </div>
  );
};
