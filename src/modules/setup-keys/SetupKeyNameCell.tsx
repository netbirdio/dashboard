import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";
import {
  AllowExtraDNSLabels,
  Ephemeral,
} from "@/modules/setup-keys/SetupKeyStatusCell";

type Props = {
  name: string;
  valid: boolean;
  secret?: string;
  ephemeral?: boolean;
  allowExtraDnsLabels?: boolean;
};
export default function SetupKeyNameCell({
  name,
  valid,
  secret,
  ephemeral,
  allowExtraDnsLabels,
}: Readonly<Props>) {
  return (
    <div className={"max-w-[260px]"}>
      <ActiveInactiveRow
        active={valid || false}
        inactiveDot={"red"}
        text={name || ""}
      >
        {secret && (
          <span
            className={
              "font-mono text-xs text-nb-gray-400 mt-1 flex items-center gap-1.5"
            }
          >
            {secret.substring(0, 5) + "****"}
            {ephemeral && <Ephemeral />}
            {allowExtraDnsLabels && <AllowExtraDNSLabels />}
          </span>
        )}
      </ActiveInactiveRow>
    </div>
  );
}
