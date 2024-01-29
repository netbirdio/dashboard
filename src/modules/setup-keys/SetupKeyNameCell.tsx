import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  name: string;
  valid: boolean;
};
export default function SetupKeyNameCell({ valid, name }: Props) {
  return <ActiveInactiveRow active={valid} inactiveDot={"red"} text={name} />;
}
