import React, {useEffect, useState} from 'react';

import {Button, Card, Col, Form, List, message, Modal, Radio, Row, Space, Tabs, TabsProps, Typography,} from "antd";
import {Container} from "../components/Container";
import SettingsPersonal from "./SettingsPersonal";
import SettingsAccount from "./SettingsAccount";

const {Title, Paragraph} = Typography;

const styleNotification = {marginTop: 85}

export const Settings = () => {
    const nsTabKey = '1'
    const items: TabsProps['items'] = [
        {
            key: nsTabKey,
            label: 'Personal Settings',
            children: <SettingsPersonal/>,
        },
        {
            key: '2',
            label: 'Account Settings',
            children: <SettingsAccount/>,
        },
    ]

    const onTabClick = (key:string) => {

    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Tabs
                            defaultActiveKey={nsTabKey}
                            items={items}
                            onTabClick={onTabClick}
                            animated={{ inkBar: true, tabPane: false }}
                            tabPosition="top"
                        />
                    </Col>
                </Row>
            </Container>
        </>
    )
}

export default Settings;