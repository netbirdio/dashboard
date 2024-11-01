import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  name: string;
  valid: boolean;
  secret?: string;
};
export default function SetupKeyNameCell({
  name,
  valid,
  secret,
}: Readonly<Props>) {
  return (
    <ActiveInactiveRow
      active={valid || false}
      inactiveDot={"red"}
      text={name || ""}
    >
      {secret && (
        <span className={"font-mono text-xs text-nb-gray-400 mt-1"}>
          {secret.substring(0, 5) + "****"}
        </span>
      )}
    </ActiveInactiveRow>
  );
}
