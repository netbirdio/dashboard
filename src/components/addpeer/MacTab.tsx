import React, {useState} from 'react';

import { Button } from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types"

export const LinuxTab = () => {

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Download and install Brew (package manager)',
            commands: (
                <Button type="primary" href="https://brew.sh/" target="_blank">Download Brew</Button>
            ),
            copied: false
        } as StepCommand,
        {
            key: 2,
            title: 'Install Netbird:',
            commands: [
                `# for CLI only`,
                `brew install netbirdio/tap/netbird`,
                `# for GUI package`,
                `brew install --cask netbirdio/tap/netbird-ui`
            ].join('\n'),
            copied: false,
            showCopyButton: true
        } as StepCommand,
        {
            key: 3,
            title: 'Run Netbird and log in the browser:',
            commands: [
                `sudo netbird up`
            ].join('\n'),
            copied: false,
            showCopyButton: true
        } as StepCommand,
        {
            key: 4,
            title: 'Get your IP address:',
            commands: [
                `sudo ifconfig utun100`
            ].join('\n'),
            copied: false,
            showCopyButton: true
        } as StepCommand
    ])

    return (
        <TabSteps stepsItems={steps}/>
    )
}

export default LinuxTab