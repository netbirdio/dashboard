import React, {useEffect, useState} from 'react';

import {Button, Card, Col, Form, List, message, Modal, Radio, Row, Space, Tabs, TabsProps, Typography,} from "antd";
import {Container} from "../components/Container";
import SettingsPersonal from "./SettingsPersonal";
import SettingsAccount from "./SettingsAccount";
import {useOidcUser} from "@axa-fr/react-oidc";
import {actions as userActions} from "../store/user";
import {useGetTokenSilently} from "../utils/token";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";

const {Title, Paragraph} = Typography;

const styleNotification = {marginTop: 85}

export const Settings = () => {
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const {oidcUser} = useOidcUser();
    const [isAdmin, setIsAdmin] = useState(false);
    const users = useSelector((state: RootState) => state.user.data)

    const nsTabKey = '1'
    const userItems: TabsProps['items'] = [
        {
            key: nsTabKey,
            label: 'Personal Settings',
            children: <SettingsPersonal/>,
        },
    ]

    const adminOnlyItems: TabsProps['items'] = [
        {
            key: '2',
            label: 'Account Settings',
            children: <SettingsAccount/>,
        },
    ]

    const [tabItems, setTabItems] = useState(userItems);

    useEffect(() => {
        if (isAdmin) {
            setTabItems(userItems.concat(adminOnlyItems));
        }
    }, [isAdmin])

    useEffect(() => {
        if(users && oidcUser) {
            let currentUser = users.find((user) => user.is_current)
            if(currentUser) {
                setIsAdmin(currentUser.role === 'admin');
            }
        }
    }, [users, oidcUser])

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently: getTokenSilently, payload: null}))
    }, [])

    const onTabClick = (key:string) => {

    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Tabs
                            defaultActiveKey={nsTabKey}
                            items={tabItems}
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