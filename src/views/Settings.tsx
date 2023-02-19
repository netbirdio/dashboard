import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Button, Card, Col, Form, message, Radio, Row, Space, Typography,} from "antd";
import {useGetAccessTokenSilently} from "../utils/token";
import {useGetGroupTagHelpers} from "../utils/groups";
import {Container} from "../components/Container";
import UserUpdate from "../components/UserUpdate";
import ExpiresInInput, {expiresInToSeconds, secondsToExpiresIn} from "./ExpiresInInput";
import {checkExpiresIn} from "../utils/common";
import {actions as accountActions} from "../store/account";
import {Account, FormAccount} from "../store/account/types";
import {values} from "lodash";

const {Title, Paragraph} = Typography;

const styleNotification = {marginTop: 85}

export const Settings = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const {
    } = useGetGroupTagHelpers()

    const accounts = useSelector((state: RootState) => state.account.data);
    const failed = useSelector((state: RootState) => state.account.failed);
    const loading = useSelector((state: RootState) => state.account.loading);
    const updatedAccount = useSelector((state: RootState) => state.account.updatedAccount);
    const users = useSelector((state: RootState) => state.user.data);
    const [formAccount, setFormAccount] = useState({} as FormAccount);
    const [formPeerExpirationEnabled, setFormPeerExpirationEnabled] = useState(true);


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
            id: account.id,
            settings: account.settings,
            peer_login_expiration_formatted: secondsToExpiresIn(account.settings.peer_login_expiration, ["hour", "day"]),
            peer_login_expiration_enabled: account.settings.peer_login_expiration_enabled
        } as FormAccount
        setFormAccount(fAccount)
        setFormPeerExpirationEnabled(fAccount.peer_login_expiration_enabled)
        form.setFieldsValue(fAccount)
    }, [accounts])

    const updatingSettings = 'updating_settings';
    useEffect(() => {
        if (updatedAccount.loading) {
            message.loading({content: 'Saving...', key: updatingSettings, duration: 0, style: styleNotification});
        } else if (updatedAccount.success) {
            message.success({
                content: 'Account settings has been successfully saved.',
                key: updatingSettings,
                duration: 2,
                style: styleNotification
            });
            dispatch(accountActions.setUpdateAccount({...updatedAccount, success: false}));
            dispatch(accountActions.resetUpdateAccount(null))
        } else if (updatedAccount.error) {
            let errorMsg = "Failed to update account settings"
            switch (updatedAccount.error.statusCode) {
                case 403:
                    errorMsg = "Failed to update account settings. You might not have enough permissions."
                    break
                default:
                    errorMsg = updatedAccount.error.data.message ? updatedAccount.error.data.message : errorMsg
                    break
            }
            message.error({
                content: errorMsg,
                key: updatingSettings,
                duration: 5,
                style: styleNotification
            });
        }
    }, [updatedAccount])

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let accountToSave = createAccountToSave(values)
                dispatch(accountActions.updateAccount.request({
                    getAccessTokenSilently: getAccessTokenSilently,
                    payload: accountToSave
                }))
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

    const createAccountToSave = (values: FormAccount): Account => {
        return {
            id: formAccount.id,
            settings: {
                peer_login_expiration: expiresInToSeconds(values.peer_login_expiration_formatted),
                peer_login_expiration_enabled: values.peer_login_expiration_enabled
            }
        } as Account
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
                                                tooltip="Enabled peer expirations allows to periodically request authentication of peers that were added with the SSO login."
                                                //rules={[{validator: selectValidatorEmptyStrings}]}
                                            >
                                                <Radio.Group
                                                    options={[{label: 'Enabled', value: true}, {
                                                        label: 'Disabled',
                                                        value: false
                                                    }]}
                                                    optionType="button"
                                                    buttonStyle="solid"
                                                    onChange={function (e) {
                                                        setFormPeerExpirationEnabled(e.target.value)
                                                    }}
                                                />
                                            </Form.Item>
                                            <Form.Item name="peer_login_expiration_formatted"
                                                       label="Peer login expires in"
                                                       tooltip="Time after which every peer added with SSO login will require re-authentication."
                                                       rules={[{validator: checkExpiresIn}]}>
                                                <ExpiresInInput
                                                    disabled={!formPeerExpirationEnabled}
                                                    options={Array.of({key: "hour", title: "Hours"}, {
                                                        key: "day",
                                                        title: "Days"
                                                    })
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