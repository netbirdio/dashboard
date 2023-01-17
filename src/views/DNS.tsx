import React, {useEffect, useState} from 'react';
import {Container} from "../components/Container";
import {
    Button, Card,
    Checkbox,
    Col, Form, Input, Radio, RadioChangeEvent,
    Row, Space,
    Tabs,
    Typography,
} from "antd";
import type { TabsProps } from 'antd';
import NameServerGroupUpdate from "../components/NameServerGroupUpdate";
import Nameservers from "./Nameservers";
import {actions as groupActions} from "../store/group";
import {useGetAccessTokenSilently} from "../utils/token";
import {useDispatch} from "react-redux";
import DNSSettings from "./DNSSettings";
const {Title, Paragraph} = Typography;

export const DNS = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()
    const [optionAllEnable, setOptionAllEnable] = useState(true);

    useEffect(() => {
        dispatch(groupActions.getGroups.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])

    const optionsDisabledEnabled = [{label: 'Enabled', value: true}, {label: 'Disabled', value: false}]

    const onChangeAllEnabled = ({target: {value}}: RadioChangeEvent) => {
        setOptionAllEnable(value)
    }

    const items: TabsProps['items'] = [
        {
            key: '1',
            label: <Title level={5}>Nameservers</Title>,
            children: Nameservers(),
        },
        {
            key: '2',
            label: <Title level={5}>Settings</Title>,
            children: DNSSettings(),
        },
    ]
    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>DNS</Title>
                        <Paragraph>Manage DNS for your NetBird account</Paragraph>
                        <Tabs
                            defaultActiveKey="1"
                            items={items}
                        />
                    </Col>
                </Row>
            </Container>
            <NameServerGroupUpdate/>
        </>
    )
}

export default DNS;