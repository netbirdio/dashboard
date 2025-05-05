import Button from "@components/Button";
import { notify } from "@components/Notification";
import { useApiCall } from "@utils/api";
import { cn } from "@utils/helpers";
import { Loader2, MailIcon } from "lucide-react";
import * as React from "react";
import { useState } from "react";
import { usePermissions } from "@/contexts/PermissionsProvider";
import { User } from "@/interfaces/User";

type Props = {
  user: User;
};
export const UserResendInviteButton = ({ user }: Props) => {
  const userRequest = useApiCall<User>("/users", true);
  const [isLoading, setIsLoading] = useState(false);
  const { permission } = usePermissions();

  const inviteUser = async () => {
    setIsLoading(true);
    notify({
      title: "Resend Invite",
      description: `The invitation is being sent to ${user.email}`,
      promise: userRequest
        .post("", `/${user.id}/invite`)
        .finally(() => setIsLoading(false)),
      loadingMessage: "Sending invitation...",
    });
  };

  const LoadingMessage = () => (
    <>
      <Loader2 size={14} className={"animate-spin block"} />
      Sending...
    </>
  );

  const DefaultMessage = () => (
    <>
      <MailIcon size={13} />
      Resend Invite
    </>
  );

  return (
    user.status == "invited" && (
      <Button
        disabled={!permission.users.create}
        variant={"secondary"}
        size={"xs"}
        onClick={inviteUser}
        className={cn("min-w-[160px]", isLoading && "animate-pulse")}
      >
        {isLoading ? <LoadingMessage /> : <DefaultMessage />}
      </Button>
    )
  );
};
