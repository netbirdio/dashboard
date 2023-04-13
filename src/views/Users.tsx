import React, {useEffect, useState} from 'react';

import {Col, Row, Tabs, TabsProps} from "antd";
import {Container} from "../components/Container";
import {useOidcUser} from "@axa-fr/react-oidc";
import {actions as userActions} from "../store/user";
import {useGetTokenSilently} from "../utils/token";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import RegularUsers from "./RegularUsers";
import ServiceUsers from "./ServiceUsers";
import UserEdit from "../components/UserEdit";

export const Users = () => {
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const {oidcUser} = useOidcUser();
    const [isAdmin, setIsAdmin] = useState(false);
    const users = useSelector((state: RootState) => state.user.data)
    const user = useSelector((state: RootState) => state.user.user)

    const [nsTabKey, setTabKey] = useState('1')
    const userItems: TabsProps['items'] = [
        {
            key: nsTabKey,
            label: 'Users',
            children: <RegularUsers/>,
        },
    ]

    const adminOnlyItems: TabsProps['items'] = [
        {
            key: '2',
            label: 'Service Users',
            children: <ServiceUsers/>,
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
        setTabKey(key)
    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                {!user && <Row>
                    <Col span={24}>
                        <Tabs
                            defaultActiveKey={nsTabKey}
                            items={tabItems}
                            onTabClick={onTabClick}
                            animated={{ inkBar: true, tabPane: false }}
                            tabPosition="top"
                            // destroyInactiveTabPane={true}
                        />
                    </Col>
                </Row>}
                {user && <UserEdit/>}
            </Container>
        </>
    )
}

export default Users;