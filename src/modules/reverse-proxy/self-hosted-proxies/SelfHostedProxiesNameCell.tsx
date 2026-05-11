import CopyToClipboardText from "@components/CopyToClipboardText";
import CircleIcon from "@/assets/icons/CircleIcon";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";

type Props = {
  cluster: ReverseProxyCluster;
};

export default function SelfHostedProxiesNameCell({ cluster }: Readonly<Props>) {
  return (
    <div className="flex items-center gap-2.5 ml-2">
      <CircleIcon active={true} size={8} inactiveDot={"gray"} />
      <CopyToClipboardText
        message={`${cluster.address} has been copied to clipboard`}
      >
        <span className="font-medium">{cluster.address}</span>
      </CopyToClipboardText>
    </div>
  );
}
