import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Container} from "../components/Container";
import {
    Alert,
    Button,
    Card,
    Col,
    Dropdown, Form,
    Input,
    Menu,
    message,
    Modal,
    Popover,
    Radio,
    RadioChangeEvent,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import {filter} from "lodash";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";
import {actions as groupActions} from "../store/group";
import {Group} from "../store/group/types";
import {useGetGroupTagHelpers} from "../utils/groups";

const {Paragraph} = Typography;

export const DNSSettings = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const {
        getGroupNamesFromIDs,
    } = useGetGroupTagHelpers()

    const groups = useSelector((state: RootState) => state.group.data)

    return (
            <>
                <Paragraph>Manage your account's DNS settings</Paragraph>
                <Col>
                    <Form
                        name="basic"
                        initialValues={{ remember: true }}
                        autoComplete="off"
                    >
                        <Space direction={"vertical"}
                               style={{ display: 'flex' }}>
                            <Card title="DNS Management" extra={<a href="#">Documentation</a>}>
                                <Form.Item
                                    label="Disable DNS management for these groups"
                                    name="disabled_management_groups"
                                    tooltip="Peers in the groups will have their DNS management disabled and will require manual configuration for domain name resolution"
                                >
                                    <Input />
                                </Form.Item>
                            </Card>
                            <Form.Item style={{  textAlign:'center' }}  >
                                <Button type="primary" htmlType="submit">
                                    Save
                                </Button>
                            </Form.Item>
                        </Space>
                    </Form>
                </Col>

            </>
            )
}

export default DNSSettings;