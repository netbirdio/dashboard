import ActiveInactiveRow from "@/modules/common-table-rows/ActiveInactiveRow";

type Props = {
  name: string;
  enabled: boolean;
};
export default function RouteNameCell({ enabled, name }: Props) {
  return (
    <div className={"flex min-w-[210px] max-w-[210px]"}>
      <ActiveInactiveRow active={enabled} inactiveDot={"gray"} text={name} />
    </div>
  );
}
