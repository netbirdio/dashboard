import React, {useState} from 'react';

import { Button } from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types"
import {getConfig} from "../../config";
const {latestVersion} = getConfig();

export const WindowsTab = () => {

    const releaseVersion = latestVersion ? latestVersion : "v0.6.3"
    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Download and run Windows installer:',
            commands: (
                <Button type="primary" href={`https://github.com/netbirdio/netbird/releases/download/${releaseVersion}/netbird_installer_${releaseVersion}_windows_amd64.exe`} target="_blank">Download NetBird</Button>
            ),
            copied: false
        } as StepCommand,
        {
            key: 2,
            title: 'Click on "Connect" from the NetBird icon in your system tray.',
            commands: '',
            copied: false,
            showCopyButton: false
        },
        {
            key: 3,
            title: 'Log in your browser.\n',
            commands: '',
            copied: false,
            showCopyButton: false
        }
    ])

    return (
        <TabSteps stepsItems={steps}/>
    )
}

export default WindowsTab