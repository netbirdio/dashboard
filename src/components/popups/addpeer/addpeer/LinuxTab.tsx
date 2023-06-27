import { useState } from "react";

import { Button } from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types";

export const OtherTab = () => {
  const [steps, _] = useState([
    {
      key: 1,
      title: "For other installation options check our documentation.",
      commands: (
        <Button
          type="primary"
          href={`https://docs.netbird.io/how-to/getting-started#binary-install`}
          target="_blank"
        >
          Documentation
        </Button>
      ),
      copied: false,
    } as StepCommand,
  ]);

  return <TabSteps stepsItems={steps} />;
};

export default OtherTab;
