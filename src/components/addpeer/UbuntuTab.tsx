import React, { useState } from 'react';

import { Button } from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types"
import { getConfig } from "../../config";
import Paragraph from 'antd/lib/skeleton/Paragraph';
import { formatNetBirdUP } from "./common"



export const UbuntuTab = () => {

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Add repository:',
            commands: [
                `sudo apt install ca-certificates curl gnupg -y`,
                `curl -L https://pkgs.wiretrustee.com/debian/public.key | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/wiretrustee.gpg`,
                `echo 'deb https://pkgs.wiretrustee.com/debian stable main' | sudo tee /etc/apt/sources.list.d/wiretrustee.list`
            ].join('\n'),
            copied: false,
            showCopyButton: true
        } as StepCommand,
        {
            key: 2,
            title: 'Install NetBird:',
            commands: [
                `sudo apt-get update`,
                `# for CLI only`,
                `sudo apt-get install netbird`,
                `# for GUI package`,
                `sudo apt-get install netbird-ui`
            ].join('\n'),
            copied: false,
            showCopyButton: true
        } as StepCommand,
        {
            key: 3,
            title: 'Run NetBird and log in the browser:',
            commands: formatNetBirdUP(),
            copied: false,
            showCopyButton: true
        } as StepCommand,
        {
            key: 4,
            title: 'Get your IP address:',
            commands: [
                `ip addr show wt0`
            ].join('\n'),
            copied: false,
            showCopyButton: true
        } as StepCommand,
    ])

    /*const clickTest = () => {
        steps.push({
            key: steps.length+1,
            title: `Test ${steps.length+1}`,
            commands: [`hi lorena!`].join('\n'),
            copied: false
        })
        console.log(steps)
        setSteps([...steps])
    }*/

    return (
        <TabSteps stepsItems={steps} />
    )
}

export default UbuntuTab
