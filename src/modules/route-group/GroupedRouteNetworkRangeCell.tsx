type Props = {
  network: string;
};
export default function GroupedRouteNetworkRangeCell({ network }: Props) {
  return (
    <div className={"font-mono dark:text-nb-gray-300 flex max-w-[10px]"}>
      {network}
    </div>
  );
}
