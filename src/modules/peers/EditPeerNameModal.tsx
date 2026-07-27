import Button from "@components/Button";
import Card from "@components/Card";
import HelpText from "@components/HelpText";
import { Input } from "@components/Input";
import { Label } from "@components/Label";
import {
  ModalClose,
  ModalContent,
  ModalFooter,
} from "@components/modal/Modal";
import ModalHeader from "@components/modal/ModalHeader";
import { trim } from "lodash";
import { Globe } from "lucide-react";
import { useMemo, useState } from "react";
import { toASCII } from "punycode";
import { Peer } from "@/interfaces/Peer";

interface Props {
  onSuccess: (name: string) => void;
  peer: Peer;
  initialName: string;
}

// "Edit Peer Name" modal (peer page + control-center context menu): name
// input with a live domain-name preview derived from the dns label.
export function EditPeerNameModal({
  onSuccess,
  peer,
  initialName,
}: Readonly<Props>) {
  const [name, setName] = useState(initialName);

  const isDisabled = useMemo(() => {
    if (name === peer.name) return true;
    const trimmedName = trim(name);
    return trimmedName.length === 0;
  }, [name, peer]);

  const domainNamePreview = useMemo(() => {
    let punyName = toASCII(name.toLowerCase());
    punyName = punyName.replace(/[^a-z0-9]/g, "-");
    let domain = "";
    if (peer.dns_label) {
      const labelList = peer.dns_label.split(".");
      if (labelList.length > 1) {
        labelList.splice(0, 1);
        domain = "." + labelList.join(".");
      }
    }
    return punyName + domain;
  }, [name, peer]);

  return (
    <ModalContent maxWidthClass={"max-w-md"}>
      <form>
        <ModalHeader
          title={"Edit Peer Name"}
          description={"Set an easily identifiable name for your peer."}
          color={"blue"}
        />

        <div className={"p-default flex flex-col gap-4"}>
          <div>
            <Input
              placeholder={"e.g., AWS Servers"}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <Card className={"w-full px-6 pt-5 pb-4"}>
            <Label>
              <Globe size={15} />
              Domain Name Preview
            </Label>
            <HelpText className={"mt-2"}>
              If the domain name already exists, we add an increment number
              suffix to it.
            </HelpText>
            <div className={"text-netbird text-sm break-all whitespace-normal"}>
              {domainNamePreview}
            </div>
          </Card>
        </div>

        <ModalFooter className={"items-center"} separator={false}>
          <div className={"flex gap-3 w-full justify-end"}>
            <ModalClose asChild={true}>
              <Button variant={"secondary"} className={"w-full"}>
                Cancel
              </Button>
            </ModalClose>

            <Button
              variant={"primary"}
              className={"w-full"}
              onClick={() => onSuccess(name)}
              disabled={isDisabled}
              type={"submit"}
            >
              Save
            </Button>
          </div>
        </ModalFooter>
      </form>
    </ModalContent>
  );
}
