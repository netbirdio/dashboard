import React, {useState} from 'react';
import {StepCommand} from "./types"
import {formatDockerCommand, formatNetBirdUP} from "./common"
import SyntaxHighlighter from "react-syntax-highlighter";
import TabSteps from "./TabSteps";
import {Button, Typography} from "antd";
import Link from "antd/lib/typography/Link";

const {Title, Paragraph, Text} = Typography;

export const DockerTab = () => {

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Install Docker',
            commands: (
                <Button style={{marginTop: "5px"}} type="primary" href="https://docs.docker.com/engine/install/" target="_blank">Official Docker website</Button>
            ),
            copied: false,
            showCopyButton: false
        } as StepCommand,
        {
            key: 2,
            title: 'Run NetBird container',
            commands: formatDockerCommand(),
            copied: false,
            showCopyButton: false
        } as StepCommand,
        {
            key: 3,
            title: "Read docs",
            commands: (
                <Link href="https://netbird.io/docs/getting-started/installation#running-netbird-in-docker" target="_blank">Running NetBird in Docker</Link>
            ),
            copied: false,
            showCopyButton: false
        } as StepCommand
    ])

    return (
        <div style={{marginTop: 10}}>
            {/*<Text style={{fontWeight: "bold"}}>
                Run in Docker
            </Text>
            <div style={{fontSize: ".85em", marginTop: 5, marginBottom: 25}}>
                <SyntaxHighlighter language="bash">
                    {formatDockerCommand()}
                </SyntaxHighlighter>
            </div>*/}
            <Text style={{fontWeight: "bold"}}>
                Install on Ubuntu
            </Text>
            <div style={{marginTop: 5}}>
                <TabSteps stepsItems={steps}/>
            </div>
        </div>


    )
}

export default DockerTab
