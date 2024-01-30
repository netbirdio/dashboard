import { IconCircleFilled } from "@tabler/icons-react";
import useFetchApi from "@utils/api";
import { cn } from "@utils/helpers";
import { FileText } from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import * as React from "react";
import datadogLogo from "@/assets/integrations/datadog.png";
import { EventStream } from "@/interfaces/EventStream";

export const EventStreamingCard = () => {
  const { data: eventStreamIntegrations } = useFetchApi<EventStream[]>(
    "/integrations/event-streaming",
  );
  const dataDogSettings = eventStreamIntegrations?.find(
    (integration) => integration.platform === "datadog",
  );

  const enabled = dataDogSettings ? dataDogSettings.enabled : false;
  const router = useRouter();

  return (
    <div className={"p-default pb-6"}>
      <div
        onClick={() => router.push("/integrations")}
        className={cn(
          "border cursor-pointer border-nb-gray-900/50 bg-nb-gray-900/30 hover:bg-nb-gray-900/50 py-3 pl-3 pr-5 rounded-lg transition-all min-w-[310px] max-w-[400px]",
        )}
      >
        <div className={"inline-flex gap-4 w-full"}>
          <div
            className={
              "h-10 w-10 shrink-0 flex items-center justify-center rounded-md bg-nb-gray-900/70 p-2 border border-nb-gray-900/70"
            }
          >
            {dataDogSettings?.enabled && (
              <Image
                src={datadogLogo}
                alt={"Datadog"}
                className={"rounded-[4px]"}
              />
            )}

            {!dataDogSettings && <FileText size={16} />}
          </div>
          <div className={""}>
            <div className={"flex items-center gap-3 justify-between"}>
              <div className={"font-medium text-sm flex gap-2 items-center"}>
                Event Streaming
              </div>
              <div
                className={cn(
                  "text-xs flex gap-2 items-center mb-2 font-medium",
                  enabled ? "text-green-500" : "text-nb-gray-500",
                )}
              >
                <IconCircleFilled size={8} />
                {enabled ? "Enabled" : "Disabled"}
              </div>
            </div>

            <p className={"text-xs font-light !text-nb-gray-300 "}>
              Stream your activity events to third-party services.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
