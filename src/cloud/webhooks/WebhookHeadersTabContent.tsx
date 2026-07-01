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
  return (
    <TabsContent value={"headers"} className={"px-8"}>
      <Label>HTTP Headers (optional)</Label>
      <HelpText>
        If your endpoint requires additional headers, you can add them here.
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
        Add Header
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
          Warning: You have added an {"'Authorization'"} header. This will
          override the{" "}
          <span className={"text-nb-gray-100 font-medium"}>
            {value.authenticationType === AuthType.Basic
              ? "Basic Auth"
              : "Bearer Token"}
          </span>{" "}
          authentication from the previous step. Please remove the{" "}
          {"'Authorization'"} header.
        </Callout>
      )}
    </TabsContent>
  );
}
