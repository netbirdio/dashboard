import { useOidcUser } from "@axa-fr/react-oidc";
import Button from "@components/Button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@components/DropdownMenu";
import { Modal } from "@components/modal/Modal";
import useFetchApi from "@utils/api";
import { ChevronDown, PlusCircle } from "lucide-react";
import React, { memo, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { Peer } from "@/interfaces/Peer";
import SetupModal from "@/modules/setup-netbird-modal/SetupModal";

// What the operator chose to add. The setup flow only distinguishes user
// devices (SSO login) from no-user peers (setup key). Autonomous agents are
// no-user peers too, so they share the server setup flow for now — they're a
// separate menu entry to guide the operator, not a separate backend type.
type AddMode = "user" | "server" | "agent";

// AddPeerDropdown replaces the single "Add Peer" button on the merged peers
// table: the operator picks what to add (User Device / Server / Autonomous
// Agent) and the matching Install NetBird flow opens.
function AddPeerDropdown() {
  const { data: peers } = useFetchApi<Peer[]>("/peers");
  const { oidcUser: user } = useOidcUser();

  const [isFirstRun, setIsFirstRun] = useLocalStorage<boolean>(
    "netbird-first-run",
    !(peers && peers.length > 0),
  );

  // Preserve the historical first-run auto-open (used by tests), defaulting to
  // the user-device flow.
  const [mode, setMode] = useState<AddMode | null>(
    process.env.APP_ENV === "test" && isFirstRun ? "user" : null,
  );

  const openMode = (next: AddMode) => {
    setMode(next);
    setIsFirstRun(false);
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant={"primary"}
            size={"sm"}
            className={"ml-auto"}
            data-testid={"add-peer-button"}
          >
            <PlusCircle size={16} />
            Add Peer
            <ChevronDown size={16} />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align={"end"}>
          <DropdownMenuItem onClick={() => openMode("user")}>
            User Device
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openMode("server")}>
            Server
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => openMode("agent")}>
            Agent
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Modal open={mode !== null} onOpenChange={(open) => !open && setMode(null)}>
        {/* User devices use the SSO-login flow; servers and agents use the
            setup-key flow (isUserDevice=false). */}
        <SetupModal user={user} isUserDevice={mode === "user"} />
      </Modal>
    </>
  );
}

export default memo(AddPeerDropdown);
