import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Button, Card, Col, Form, message, Radio, Row, Space, Typography,} from "antd";
import {useGetAccessTokenSilently} from "../utils/token";
import {useGetGroupTagHelpers} from "../utils/groups";
import {actions as dnsSettingsActions} from '../store/dns-settings';
import {DNSSettings, DNSSettingsToSave} from "../store/dns-settings/types";
import {Container} from "../components/Container";
import UserUpdate from "../components/UserUpdate";
import ExpiresInInput, {secondsToExpiresIn} from "./ExpiresInInput";
import {checkExpiresIn} from "../utils/common";
import {actions as accountActions} from "../store/account";
import {Account, FormAccount} from "../store/account/types";

const {Title, Paragraph} = Typography;

export const Settings = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const {
        getExistingAndToCreateGroupsLists,
        selectValidatorEmptyStrings
    } = useGetGroupTagHelpers()

    const accounts = useSelector((state: RootState) => state.account.data);
    const failed = useSelector((state: RootState) => state.account.failed);
    const loading = useSelector((state: RootState) => state.account.loading);
    const users = useSelector((state: RootState) => state.user.data);
    const [formAccount, setFormAccount] = useState({} as FormAccount);


    const [form] = Form.useForm()

    useEffect(() => {
        dispatch(accountActions.getAccounts.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        if (accounts.length < 1) {
            console.error("invalid account data returned from the Management API", accounts)
            return
        }
        let account = accounts[0]

        let fAccount = {
            ...account,
            peer_login_expiration_formatted: secondsToExpiresIn(account.settings.peer_login_expiration, ["hour", "day"]),
            peer_login_expiration_enabled: account.settings.peer_login_expiration_enabled
        } as FormAccount
        setFormAccount(fAccount)
        console.log(fAccount)
        form.setFieldsValue(fAccount)
    }, [accounts])

    const createKey = 'saving';
    /*useEffect(() => {
        if (savedDNSSettings.loading) {
            message.loading({content: 'Saving...', key: createKey, duration: 0, style: styleNotification});
        } else if (savedDNSSettings.success) {
            message.success({
                content: 'DNS settings has been successfully saved.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(dnsSettingsActions.setSavedDNSSettings({...savedDNSSettings, success: false}));
            dispatch(dnsSettingsActions.resetSavedDNSSettings(null))
        } else if (savedDNSSettings.error) {
            let errorMsg = "Failed to update DNS settings"
            switch (savedDNSSettings.error.statusCode) {
                case 403:
                    errorMsg = "Failed to update DNS settings. You might not have enough permissions."
                    break
                default:
                    errorMsg = savedDNSSettings.error.data.message ? savedDNSSettings.error.data.message : errorMsg
                    break
            }
            message.error({
                content: errorMsg,
                key: createKey,
                duration: 5,
                style: styleNotification
            });
            dispatch(dnsSettingsActions.setSavedDNSSettings({...savedDNSSettings, error: null}));
            dispatch(nsGroupActions.resetSavedNameServerGroup(null))
        }
    }, [savedDNSSettings])*/

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let dnsSettingsToSave = createDNSSettingsToSave(values)
                dispatch(dnsSettingsActions.saveDNSSettings.request({
                    getAccessTokenSilently: getAccessTokenSilently,
                    payload: dnsSettingsToSave
                }))
            })
            .then(() => {
                console.log("issued the request")
            })
            .catch((errorInfo) => {
                let msg = "please check the fields and try again"
                if (errorInfo.errorFields) {
                    msg = errorInfo.errorFields[0].errors[0]
                }
                message.error({
                    content: msg,
                    duration: 1,
                });
            });
    }

    const createDNSSettingsToSave = (values: DNSSettings): DNSSettingsToSave => {
        let [existingGroups, newGroups] = getExistingAndToCreateGroupsLists(values.disabled_management_groups)
        return {
            disabled_management_groups: existingGroups,
            groupsToCreate: newGroups
        } as DNSSettingsToSave
    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Settings</Title>
                        <Paragraph>Manage your account's settings</Paragraph>
                        <Space direction="vertical" size="large" style={{display: 'flex'}}>

                            <Card bodyStyle={{padding: 0}}>
                                <Form
                                    name="basic"
                                    autoComplete="off"
                                    form={form}
                                    onFinish={handleFormSubmit}
                                >
                                    <Space direction={"vertical"}
                                           style={{display: 'flex'}}>
                                        <Card
                                            title="Authentication"
                                            loading={loading}
                                            defaultValue={"Enabled"}
                                        >
                                            <Form.Item
                                                label="Peer login expiration"
                                                name="peer_login_expiration_enabled"
                                                tooltip=" "
                                                rules={[{validator: selectValidatorEmptyStrings}]}
                                            >
                                                <Radio.Group
                                                    options={[{label: 'Enabled', value: true}, {
                                                        label: 'Disabled',
                                                        value: false
                                                    }]}
                                                    optionType="button"
                                                    buttonStyle="solid"
                                                />
                                            </Form.Item>
                                            <Form.Item name="peer_login_expiration_formatted" label="Peer login expires in"
                                                       tooltip=" "
                                                       rules={[{validator: checkExpiresIn}]}>
                                                <ExpiresInInput options={
                                                    Array.of(
                                                        {key: "hour", title: "Hours"},
                                                        {key: "day", title: "Days"})
                                                }/>
                                            </Form.Item>
                                        </Card>
                                        <Form.Item style={{textAlign: 'center'}}>
                                            <Button type="primary" htmlType="submit">
                                                Save
                                            </Button>
                                        </Form.Item>
                                    </Space>
                                </Form>
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Container>
            <UserUpdate/>
        </>
    )
}

export default Settings;