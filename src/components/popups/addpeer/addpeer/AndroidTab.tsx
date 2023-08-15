import React, {useState} from 'react';

import {Button, Image, Typography} from "antd";
import TabSteps from "./TabSteps";
import { StepCommand } from "./types"
import googleplay from '../../../../assets/google-play-badge.png';
import {getConfig} from "../../../../config";
const { grpcApiOrigin } = getConfig();

const {Text} = Typography;

export const AndroidTab = () => {

    const [steps, setSteps] = useState([
        {
            key: 1,
            title: 'Download and install the application from Google Play Store:',
            commands: (
                <a data-testid="download-android-button" href="https://play.google.com/store/apps/details?id=io.netbird.client" target="_blank">
                    <Image width="12em" preview={false} style={{marginTop: "5px"}} src={googleplay}/>
                </a>
            ),
            copied: false
        } as StepCommand,
        ... grpcApiOrigin ? [{
            key: 2,
            title: 'Click on "Change Server" and enter the following "Server"',
            commands: grpcApiOrigin,
            commandsForCopy: grpcApiOrigin,
            copied: false,
            showCopyButton: false
        }] : [],
        {
            key: 2 + (grpcApiOrigin ? 1 : 0),
            title: 'Click on the "Connect" button in the middle of the screen',
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
                Install on Android
            </Text>
            <div style={{marginTop: 5}}>
                <TabSteps stepsItems={steps}/>
            </div>

        </div>
    )
}

export default AndroidTab