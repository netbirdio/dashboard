import { Route } from "@/interfaces/Route";

type Props = {
  route: Route;
};
export default function PeerRouteNetworkCell({ route }: Props) {
  return (
    <div className={"font-mono dark:text-nb-gray-300 flex max-w-[10px]"}>
      {route.network}
    </div>
  );
}
