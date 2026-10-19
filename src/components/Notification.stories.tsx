import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@components/Accordion";
import Notification from "@components/Notification";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { FolderGit2 } from "lucide-react";
import { useState } from "react";
import { padded } from "@/storybook/components";

/* A promise that never settles keeps the notification in its loading state. */
const pending = new Promise(() => {});

/* Notifications stay on screen far longer than a capture takes. */
const LONG = 10 ** 9;

const meta: Meta = {
  title: "Components/Notification",
  decorators: [padded],
};
export default meta;

function Rejecting() {
  // Created per mount, so the component always observes the rejection.
  const [promise] = useState(() =>
    Promise.reject({
      code: 403,
      message: "permission denied",
      requestId: "req-7f3a9c",
    }),
  );
  return (
    <Notification
      toastId={"story-error"}
      title={"Peer could not be deleted"}
      description={""}
      promise={promise}
      loadingMessage={"Deleting peer..."}
      duration={LONG}
    />
  );
}

export const Variants: StoryObj = {
  render: () => (
    <div className={"flex flex-col gap-6 w-[380px]"}>
      <Notification
        toastId={"story-success"}
        title={"Peer updated"}
        description={"macbook-pro-olivia was successfully renamed."}
        duration={LONG}
      />
      <Notification
        toastId={"story-custom"}
        title={"Group created"}
        description={"Developers was created."}
        icon={<FolderGit2 size={14} />}
        backgroundColor={"bg-netbird"}
        duration={LONG}
      />
      <Notification
        toastId={"story-loading"}
        title={"Saving"}
        description={""}
        loadingTitle={"Saving changes"}
        loadingMessage={"Please wait..."}
        promise={pending}
        duration={LONG}
      />
      <Rejecting />
    </div>
  ),
};

export const AccordionStates: StoryObj = {
  tags: ["capture-hover", "capture-focus"],
  render: () => (
    <div className={"w-[520px]"}>
      <Accordion type={"single"} defaultValue={"one"} collapsible>
        <AccordionItem value={"one"}>
          <AccordionTrigger>Open item</AccordionTrigger>
          <AccordionContent>
            Content of the open accordion item.
          </AccordionContent>
        </AccordionItem>
        <AccordionItem value={"two"}>
          <AccordionTrigger data-capture={""}>Closed item</AccordionTrigger>
          <AccordionContent>Hidden content.</AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  ),
};
