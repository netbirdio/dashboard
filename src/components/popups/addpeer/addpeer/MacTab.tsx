import React, {useState} from 'react';

import {Button, Divider, Row, Tooltip, Typography} from "antd";
import TabSteps from "./TabSteps";
import {StepCommand} from "./types"
import {formatNetBirdUP} from "./common"
import {Collapse} from "antd";
import SyntaxHighlighter from "react-syntax-highlighter";
import {QuestionCircleOutlined} from "@ant-design/icons";
const { Panel } = Collapse;

const {Text} = Typography;

export const LinuxTab = () => {

    const [quickSteps, setQuickSteps] = useState([
        {
            key: 1,
            title: (
                <Row>
                    <Text>Download and run MacOS installer: </Text>
                    <Tooltip title={
                        <text>If you don't know what chip your Mac has, you can find out by clicking on the Apple logo in the top left corner of your screen and selecting 'About This Mac'. For more information click <a href="https://support.apple.com/en-us/HT211814" target="_blank">here</a></text>
                    }
                             className={"ant-form-item-tooltip"}>
                        <QuestionCircleOutlined style={{color: "rgba(0, 0, 0, 0.45)", cursor: "help", marginLeft: "3px"}}/>
                    </Tooltip>
                </Row>

            ),
            commands: (
                <Row style={{paddingTop: "5px"}}>
                    <Button style={{marginRight: "10px"}} type="primary" href="https://pkgs.netbird.io/macos/amd64">Download for Intel</Button>
                    <Button style={{marginRight: "10px"}} type="default" href="https://pkgs.netbird.io/macos/arm64">Download for M1 & M2</Button>
                </Row>
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
                Install on MacOS
            </Text>
            <div style={{marginTop: 5}}>
                <TabSteps stepsItems={quickSteps}/>
            </div>
            <Divider style={{marginTop: "5px"}} />
            <Collapse bordered={false} style={{backgroundColor: "unset"}}>
                <Panel className="CustomPopupCollapse"  header={
                    <b>Or install via command line</b>
                } key="1">
                    <Text style={{fontWeight: "bold"}}>
                        Install with one command
                    </Text>
                    <div style={{fontSize: ".85em", marginTop: 5, marginBottom: 25}}>
                        <SyntaxHighlighter language="bash">
                            curl -fsSL https://pkgs.netbird.io/install.sh | sh
                        </SyntaxHighlighter>
                    </div>
                    <Text style={{fontWeight: "bold"}}>
                        Or install manually with HomeBrew
                    </Text>
                    <div style={{marginTop: 5}}>
                        <TabSteps stepsItems={steps}/>
                    </div>
                </Panel>
            </Collapse>
        </div>
    )
}

export default LinuxTab