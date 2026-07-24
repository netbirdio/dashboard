import { useTranslations } from "next-intl";
import React from "react";
import Button from "@components/Button";
import HelpText from "@components/HelpText";
import { Label } from "@components/Label";
import { Callout } from "@components/Callout";
import { TabsContent } from "@components/Tabs";
import { AlertTriangleIcon, PlusIcon } from "lucide-react";
import {
  AuthType,
} from "@/cloud/webhooks/WebhookAuthenticationSettings";
import {
  ActionType,
  HeadersInput,
} from "@/cloud/webhooks/WebhookHeadersInput";
import { WebhookConfig } from "@/cloud/webhooks/useWebhookConfig";

type Props = {
  value: WebhookConfig;
};

export function WebhookHeadersTabContent({ value }: Readonly<Props>) {
  const t = useTranslations("webhooks");
  return (
    <TabsContent value={"headers"} className={"px-8"}>
      <Label>{t("httpHeaders")}</Label>
      <HelpText>
        {t("httpHeadersHelp")}
      </HelpText>
      {value.httpHeaders.length > 0 && (
        <div className={"flex gap-3 w-full mb-3"}>
          <div className={"flex flex-col gap-2 w-full"}>
            {value.httpHeaders.map((header, i) => (
              <HeadersInput
                key={header.id}
                value={header}
                onChange={(h) =>
                  value.setHttpHeaders({
                    type: ActionType.UPDATE,
                    index: i,
                    header: h,
                  })
                }
                onRemove={() =>
                  value.setHttpHeaders({
                    type: ActionType.REMOVE,
                    index: i,
                  })
                }
                onError={(error) => value.setHeaderError(error)}
              />
            ))}
          </div>
        </div>
      )}
      <Button
        variant={"dotted"}
        className={"w-full"}
        size={"sm"}
        onClick={() => value.setHttpHeaders({ type: ActionType.ADD })}
        data-testid="webhook-add-header"
      >
        <PlusIcon size={14} />
        {t("addHeader")}
      </Button>

      {value.authHeaderConflict && (
        <Callout
          icon={
            <AlertTriangleIcon
              size={16}
              className={"shrink-0 mt-[2px] text-yellow-400"}
            />
          }
          className={"mt-5"}
        >
          {t("authHeaderConflict", {
            authType:
              value.authenticationType === AuthType.Basic
                ? t("basicAuth")
                : t("bearerToken"),
          })}
        </Callout>
      )}
    </TabsContent>
  );
}
