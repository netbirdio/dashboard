import "highlight.js/styles/mono-blue.css";
import "highlight.js/lib/languages/bash";
import { StepCommand } from "./types";
import SyntaxHighlighter from "react-syntax-highlighter";
import { Typography, Space, Steps, Button, Popover, StepsProps } from "antd";
import { copyToClipboard } from "../../../../utils/common";
import { CheckOutlined, CopyOutlined } from "@ant-design/icons";
import React, { useEffect, useState } from "react";
const { Step } = Steps;
const { Text } = Typography;

type Props = {
  stepsItems: Array<StepCommand>;
};

const TabSteps: React.FC<Props> = ({ stepsItems }) => {
  const [steps, setSteps] = useState(stepsItems);

  useEffect(() => setSteps(stepsItems), [stepsItems]);

  const onCopyClick = (
    key: string | number,
    commands: React.ReactNode | string,
    copied: boolean
  ) => {
    if (!(typeof commands === "string")) return;
    copyToClipboard(commands);
    const step = steps.find((s) => s.key === key);
    if (step) step.copied = copied;
    setSteps([...steps]);

    if (copied) {
      setTimeout(() => {
        onCopyClick(key, commands, false);
      }, 2000);
    }
  };
  return (
    <Steps direction="vertical" size={"small"}>
      {steps.map((c) => (
        <Step
          status={"process"}
          key={c.key}
          title={<Text>{c.title}</Text>}
          description={
            <Space
              className="nb-code"
              direction="vertical"
              size="small"
              style={{ display: "flex", fontSize: ".85em" }}
            >
              {c.commands && typeof c.commands === "string" ? (
                <>
                  {!c.copied ? (
                    <Button
                      type="text"
                      size="middle"
                      className="btn-copy-code peer"
                      icon={<CopyOutlined />}
                      style={{ color: "rgb(107, 114, 128)"}}
                      onClick={() => {
                        onCopyClick(c.key, c.commandsForCopy, true);
                      }}
                    />
                  ) : (
                    <Button
                      type="text"
                      size="middle"
                      className="btn-copy-code peer"
                      icon={<CheckOutlined />}
                      style={{ color: "green"}}
                    />
                  )}
                  <SyntaxHighlighter language="bash">
                    {c.commands}
                  </SyntaxHighlighter>
                </>
              ) : (
                c.commands
              )}
            </Space>
          }
        />
      ))}
    </Steps>
  );
};

export default TabSteps;
