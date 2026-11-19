import CopyToClipboardText from "@components/CopyToClipboardText";
import CircleIcon from "@/assets/icons/CircleIcon";
import { useTranslations } from "@/i18n/LocaleProvider";
import { ReverseProxyCluster } from "@/interfaces/ReverseProxy";
import { ClusterTypeIndicator } from "@/modules/reverse-proxy/clusters/ClusterTypeIndicator";

type Props = {
  cluster: ReverseProxyCluster;
};

export default function ClustersNameCell({ cluster }: Readonly<Props>) {
  const t = useTranslations();
  return (
    <div className="flex items-center gap-2.5 ml-2">
      <CircleIcon active={cluster.online} size={8} inactiveDot={"gray"} />
      <CopyToClipboardText
        message={t("reverseProxy.clusterAddressCopied", {
          address: cluster.address,
        })}
      >
        <span className="font-medium">{cluster.address}</span>
      </CopyToClipboardText>
      <ClusterTypeIndicator cluster={cluster} />
    </div>
  );
}
