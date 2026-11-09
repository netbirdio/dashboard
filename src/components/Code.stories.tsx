import Code from "@components/Code";
import Steps from "@components/Steps";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { padded, Row, Stack } from "@/storybook/components";

const meta: Meta = {
  title: "Components/Code",
  decorators: [padded],
};
export default meta;

export const Blocks: StoryObj = {
  tags: ["capture-hover"],
  render: () => (
    <Stack>
      <Row label={"default"} className={"w-[520px]"}>
        <div className={"w-full"} data-capture={""}>
          <Code>
            <Code.Comment># Install NetBird</Code.Comment>
            <Code.Line>
              curl -fsSL https://pkgs.netbird.io/install.sh | sh
            </Code.Line>
          </Code>
        </div>
      </Row>
      <Row label={"dark"} className={"w-[520px]"}>
        <div className={"w-full"}>
          <Code dark>
            <Code.Line>
              netbird up --setup-key 4F0E7A1C-9B2D-4E3F-8A6B-1C2D3E4F5A6B
            </Code.Line>
          </Code>
        </div>
      </Row>
      <Row label={"small, no copy"} className={"w-[520px]"}>
        <div className={"w-full"}>
          <Code small showCopyIcon={false}>
            https://api.netbird.io
          </Code>
        </div>
      </Row>
    </Stack>
  ),
};

export const StepList: StoryObj = {
  render: () => (
    <div className={"grid grid-cols-2 gap-10 w-[1100px]"}>
      <Steps>
        <Steps.Step step={1}>
          <p className={"text-sm"}>Download and install the client</p>
        </Steps.Step>
        <Steps.Step step={2}>
          <p className={"text-sm"}>Run netbird up</p>
          <Code>
            <Code.Line>netbird up</Code.Line>
          </Code>
        </Steps.Step>
        <Steps.Step step={3} line={false}>
          <p className={"text-sm"}>Done</p>
        </Steps.Step>
      </Steps>
      <Steps>
        <Steps.Step step={1} status={"complete"}>
          <p className={"text-sm"}>Completed step</p>
        </Steps.Step>
        <Steps.Step step={2} status={"current"}>
          <p className={"text-sm"}>Current step</p>
        </Steps.Step>
        <Steps.Step step={3} status={"upcoming"}>
          <p className={"text-sm"}>Upcoming step</p>
        </Steps.Step>
        <Steps.Step step={4} disabled line={false}>
          <p className={"text-sm"}>Disabled step</p>
        </Steps.Step>
      </Steps>
      <div className={"col-span-2"}>
        <Steps horizontal>
          <Steps.Step step={1} horizontal status={"complete"} center>
            <p className={"text-xs"}>Account</p>
          </Steps.Step>
          <Steps.Step step={2} horizontal status={"current"} center>
            <p className={"text-xs"}>Network</p>
          </Steps.Step>
          <Steps.Step step={3} horizontal line={false} center size={"large"}>
            <p className={"text-xs"}>Finish</p>
          </Steps.Step>
        </Steps>
      </div>
    </div>
  ),
};
