import React, {useState} from 'react';

import {Button, Typography} from "antd";
import TabSteps from "./TabSteps";
import {StepCommand} from "./types"
import {formatNetBirdUP} from "./common"
import {Collapse} from "antd";
const { Panel } = Collapse;

const {Text} = Typography;

export const LinuxTab = () => {

    const [quickSteps, setQuickSteps] = useState([
        {
            key: 1,
            title: 'Download and run installer:',
            commands: (
                <Button style={{marginTop: "5px"}} type="primary" href="https://pkgs.netbird.io/windows/x64"
                        target="_blank">Download NetBird</Button>
            ),
            copied: false
        } as StepCommand,
        {
            key: 2,
            title: 'Click on "Connect" from the NetBird icon in your system tray',
            commands: '',
            copied: false,
            showCopyButton: false
        },
        {
            key: 3,
            title: 'Sign up using your email address',
            commands: '',
            copied: false,
            showCopyButton: false
        }
    ])

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Download and install Homebrew',
            commands: (
                <Button style={{marginTop: "5px"}} type="primary" href="https://brew.sh/" target="_blank">Download
                    Brew</Button>
            ),
            copied: false
        } as StepCommand,
        {
            key: 2,
            title: 'Install NetBird:',
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
            title: 'Start NetBird daemon:',
            commands: [
                `sudo netbird service install`,
                `sudo netbird service start`
            ].join('\n'),
            copied: false,
            showCopyButton: true
        } as StepCommand,
        {
            key: 4,
            title: 'Run NetBird and log in the browser:',
            commands: formatNetBirdUP(),
            copied: false,
            showCopyButton: true
        } as StepCommand
    ])

    return (
        <div style={{marginTop: 10}}>
            <Text style={{fontWeight: "bold"}}>
                Install on macOS
            </Text>
            <div style={{marginTop: 5}}>
                <TabSteps stepsItems={quickSteps}/>
            </div>
            <Collapse style={{marginLeft: -15}} bordered={false}>
                <Panel header={<Text style={{fontWeight: "bold"}}>
                    Or install manually with Homebrew
                </Text>} key="1">
                    <div style={{marginTop: 5}}>
                        <TabSteps stepsItems={steps}/>
                    </div>
                </Panel>
            </Collapse>
        </div>
    )
}

export default LinuxTab