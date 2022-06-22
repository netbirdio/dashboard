import { useState } from 'react';

import { Button } from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types"


export const LinuxTab = () => {

    const [steps, _] = useState([
        {
            key: 1,
            title: 'For different distros, or to install from source:',
            commands: (
                <Button type="primary" href={`https://netbird.io/docs/getting-started/installation#binary-install`} target="_blank">
                    Documentation
                </Button>
            ),
            copied: false,
        } as StepCommand,
    ])

    return (
        <TabSteps stepsItems={steps} />
    )
}

export default LinuxTab
