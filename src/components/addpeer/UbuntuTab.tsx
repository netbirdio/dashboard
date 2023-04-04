import React, {useState} from 'react';
import {StepCommand} from "./types"
import {formatNetBirdUP} from "./common"
import SyntaxHighlighter from "react-syntax-highlighter";
import TabSteps from "./TabSteps";
import {Typography} from "antd";

const {Title, Paragraph, Text} = Typography;

export const UbuntuTab = () => {

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Add repository',
            commands: [
                `sudo apt install ca-certificates curl gnupg -y`,
                `curl -L https://pkgs.wiretrustee.com/debian/public.key | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/wiretrustee.gpg`,
                `echo 'deb https://pkgs.wiretrustee.com/debian stable main' | sudo tee /etc/apt/sources.list.d/wiretrustee.list`
            ].join('\n'),
            copied: false,
            showCopyButton: false
        } as StepCommand,
        {
            key: 2,
            title: 'Install NetBird',
            commands: [
                `sudo apt-get update`,
                `# for CLI only`,
                `sudo apt-get install netbird`,
                `# for GUI package`,
                `sudo apt-get install netbird-ui`
            ].join('\n'),
            copied: false,
            showCopyButton: false
        } as StepCommand,
        {
            key: 3,
            title: 'Run NetBird and log in the browser',
            commands: formatNetBirdUP(),
            copied: false,
            showCopyButton: false
        } as StepCommand
    ])

    return (
        <div style={{marginTop: 10}}>
            <Text style={{fontWeight: "bold"}}>
                Install with one command
            </Text>
            <div style={{fontSize: ".85em", marginTop: 5, marginBottom: 25}}>
                <SyntaxHighlighter language="bash">
                    curl -fsSL https://pkgs.netbird.io/install.sh | sh
                </SyntaxHighlighter>
            </div>
            <Text style={{fontWeight: "bold"}}>
                Or install manually on Ubuntu
            </Text>
            <div style={{marginTop: 5}}>
                <TabSteps stepsItems={steps}/>
            </div>

        </div>

    )
}

export default UbuntuTab
