import React, {useState} from 'react';

import {Button, Typography} from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types"
import {getConfig} from "../../../../config";
const { grpcApiOrigin } = getConfig();

const {Text} = Typography;

export const WindowsTab = () => {

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Download and run Windows installer:',
            commands: (
                <Button data-testid="download-windows-button" style={{marginTop: "5px"}} type="primary" href="https://pkgs.netbird.io/windows/x64" target="_blank">Download NetBird</Button>
            ),
            copied: false
        } as StepCommand,
        ... grpcApiOrigin ? [{
            key: 2,
            title: 'Click on "Settings" from the NetBird icon in your system tray and enter the following "Management URL"',
            commands: grpcApiOrigin,
            commandsForCopy: grpcApiOrigin,
            copied: false,
            showCopyButton: false
        }] : [],
        {
            key: 2 + (grpcApiOrigin ? 1 : 0),
            title: 'Click on "Connect" from the NetBird icon in your system tray',
            commands: '',
            copied: false,
            showCopyButton: false
        },
        {
            key: 3 + (grpcApiOrigin ? 1 : 0),
            title: 'Sign up using your email address',
            commands: '',
            copied: false,
            showCopyButton: false
        }
    ])

    return (
        <div style={{marginTop: 10}}>
            <Text style={{fontWeight: "bold"}}>
                Install on Windows
            </Text>
            <div style={{marginTop: 5}}>
                <TabSteps stepsItems={steps}/>
            </div>

        </div>
    )
}

export default WindowsTab