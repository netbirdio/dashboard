import React, {useState} from 'react';

import {Tabs, TabsProps} from "antd";
import Icon, {AndroidFilled, AppleFilled, WindowsFilled} from "@ant-design/icons";
import {ReactComponent as LinuxSVG} from "../icons/terminal_icon.svg";
import UbuntuTab from "./UbuntuTab";
import {ReactComponent as DockerSVG} from "../icons/docker_icon.svg";
import Paragraph from "antd/lib/typography/Paragraph";
import WindowsTab from "./WindowsTab";
import MacTab from "./MacTab";
import Link from "antd/lib/typography/Link";
import DockerTab from "./DockerTab";

const detectOSTab = () => {
    let os = 1;
    if (navigator.userAgent.indexOf("Win") !== -1) os = 2;
    if (navigator.userAgent.indexOf("Mac") !== -1) os = 3;
    if (navigator.userAgent.indexOf("X11") !== -1) os = 1;
    if (navigator.userAgent.indexOf("Linux") !== -1) os = 1
    return os
}

export const AddPeerPopup = () => {

    const [openTab, setOpenTab] = useState(detectOSTab);

    const items: TabsProps['items'] = [
        {
            key: "1",
            label: <span><Icon component={LinuxSVG}/>Linux</span>,
            children: <UbuntuTab/>,
        },
        {
            key: "2",
            label: <span><WindowsFilled/>Windows</span>,
            children: <WindowsTab/>,
        },
        {
            key: "3",
            label: <span><AppleFilled/>macOS</span>,
            children: <MacTab/>,
        },
        {
            key: "4",
            label: <span><AndroidFilled/>Android</span>,
            children: <></>,
        },
        {
            key: "5",
            label: <span><Icon component={DockerSVG}/>Docker</span>,
            children: <DockerTab/>,
        }
    ];

    return <>
        <Paragraph
            style={{textAlign: "center", whiteSpace: "pre-line", fontSize: "2em", marginBottom: -10}}>
            Hi there!
        </Paragraph>
        <Paragraph
            style={{textAlign: "center", whiteSpace: "pre-line", fontSize: "2em"}}>
            It's time to add your first device.
        </Paragraph>
        <Paragraph type={"secondary"}
                   style={{
                       marginTop: "-15px",
                       textAlign: "center",
                       whiteSpace: "pre-line",
                   }}>
            To get started install NetBird and log in using your {"\n"} name@gmail.com account.
        </Paragraph>

        <Tabs centered
              defaultActiveKey={openTab.toString()} tabPosition="top" animated={{inkBar: true, tabPane: false}}
              items={items}/>
        <Paragraph type={"secondary"}
                   style={{
                       marginTop: "15px",
                   }}>
            After that you should be connected. Add more devices to your network or manage your existing devices in the admin panel.
            If you have further questions check out our {<Link target="_blank" href={"https://netbird.io/docs/getting-started/installation"}>installation guide</Link>}
        </Paragraph>
    </>
}

export default AddPeerPopup