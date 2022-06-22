import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {Container} from "../components/Container";

import {
    Col,
    Row,
    Typography,
    Space,
    Tabs
} from "antd";

import {ExclamationCircleOutlined} from "@ant-design/icons";
import LinuxTab from "../components/addpeer/LinuxTab";
import MacTab from "../components/addpeer/MacTab";
import WindowsTab from "../components/addpeer/WindowsTab";
const { Title, Paragraph } = Typography;
const { TabPane } = Tabs;

export const AddPeer = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const detectOS = () => {
        let os = 1;
        if (navigator.userAgent.indexOf("Win")!==-1) os=2;
        if (navigator.userAgent.indexOf("Mac")!==-1) os=3;
        if (navigator.userAgent.indexOf("X11")!==-1) os=1;
        if (navigator.userAgent.indexOf("Linux")!==-1) os=1
        return os
    }
    const [openTab, setOpenTab] = useState(detectOS);

    useEffect(() => {
    }, [])

    const onChangeTab = (key: string) => {};

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Add Peer</Title>
                        <Paragraph>To get started with NetBird just install the app and log in.</Paragraph>
                        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                            <Tabs defaultActiveKey={openTab.toString()} onChange={onChangeTab} tabPosition="top" animated={{ inkBar: true, tabPane: false }}>
                                <TabPane tab="Linux" key="1">
                                    <LinuxTab/>
                                </TabPane>
                                <TabPane tab="Windows" key="2">
                                    <WindowsTab/>
                                </TabPane>
                                <TabPane tab="MacOS" key="3">
                                    <MacTab/>
                                </TabPane>
                            </Tabs>
                        </Space>
                    </Col>
                </Row>
            </Container>
        </>
    )
}

export default withAuthenticationRequired(AddPeer,
    {
        onRedirecting: () => <Loading/>,
    }
)