import React, {useState} from 'react';

import { Button } from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types"
import {getConfig} from "../../config";
const {latestVersion, grpcApiOrigin} = getConfig();

const hostedSteps = () => {
    return [{
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
    }]
}

const selfHostedSteps = () => {
    return [{
        key: 2,
        title: 'Open Powershell in Admin Mode and Configure with Setup Key',
        commands: [
            `netbird down`,
            `netbird up --management-url ${grpcApiOrigin} --setup-key YOUR_SETUP_KEY`
        ].join("\n"),
        copied: false,
        showCopyButton: true
    },
    {
        key: 3,
        title: 'Log in your browser.\n',
        commands: '',
        copied: false,
        showCopyButton: false
    }]
}

const stepsForWindows = () => {
    // self hosted
    if(grpcApiOrigin){
        return selfHostedSteps()
    }
    // saas version
    else{
        return hostedSteps()
    }
}

export const WindowsTab = () => {

    const releaseVersion = latestVersion ? latestVersion.replace("v", "") : "0.6.3"

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Download and run Windows installer:',
            commands: (
                <Button type="primary" href={`https://github.com/netbirdio/netbird/releases/download/v${releaseVersion}/netbird_installer_${releaseVersion}_windows_amd64.exe`} target="_blank">Download NetBird</Button>
            ),
            copied: false
        } as StepCommand,
        ...stepsForWindows()
    ])

    return (
        <TabSteps stepsItems={steps}/>
    )
}

export default WindowsTab