import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Button, Card, Col, Form, List, message, Modal, Radio, Row, Space, Typography,} from "antd";
import {useGetTokenSilently} from "../utils/token";
import {useGetGroupTagHelpers} from "../utils/groups";
import {Container} from "../components/Container";
import UserUpdate from "../components/UserUpdate";
import ExpiresInInput, {expiresInToSeconds, secondsToExpiresIn} from "./ExpiresInInput";
import {checkExpiresIn} from "../utils/common";
import {actions as accountActions} from "../store/account";
import {Account, FormAccount} from "../store/account/types";
import {ExclamationCircleOutlined, QuestionCircleFilled} from "@ant-design/icons";

const {Title, Paragraph} = Typography;

const styleNotification = {marginTop: 85}

export const Settings = () => {
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const {
    } = useGetGroupTagHelpers()

    const accounts = useSelector((state: RootState) => state.account.data);
    const failed = useSelector((state: RootState) => state.account.failed);
    const loading = useSelector((state: RootState) => state.account.loading);
    const updatedAccount = useSelector((state: RootState) => state.account.updatedAccount);
    const users = useSelector((state: RootState) => state.user.data);
    const [formAccount, setFormAccount] = useState({} as FormAccount);
    const [accountToAction, setAccountToAction] = useState({} as FormAccount);
    const [formPeerExpirationEnabled, setFormPeerExpirationEnabled] = useState(true);
    const [confirmModal, confirmModalContextHolder] = Modal.useModal();

    const [form] = Form.useForm()

    useEffect(() => {
        dispatch(accountActions.getAccounts.request({getAccessTokenSilently: getTokenSilently, payload: null}));
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
                content: 'Account settings have been successfully saved.',
                key: updatingSettings,
                duration: 2,
                style: styleNotification
            });
            dispatch(accountActions.setUpdateAccount({...updatedAccount, success: false}));
            dispatch(accountActions.resetUpdateAccount(null))
            let fAccount = {
                id: updatedAccount.data.id,
                settings: updatedAccount.data.settings,
                peer_login_expiration_formatted: secondsToExpiresIn(updatedAccount.data.settings.peer_login_expiration, ["hour", "day"]),
                peer_login_expiration_enabled: updatedAccount.data.settings.peer_login_expiration_enabled
            } as FormAccount
            setFormAccount(fAccount)
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
                confirmSave(values)
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

    const confirmSave = (newValues: FormAccount) => {
        if (newValues.peer_login_expiration_enabled != formAccount.peer_login_expiration_enabled) {
            let content = newValues.peer_login_expiration_enabled ? "Enabling peer expiration will cause some peers added with the SSO login to disconnect, and re-authentication will be required. Do you want to enable peer login expiration?" : "Disabling peer expiration will cause peers added with the SSO login never to expire. For security reasons, keeping peers expiring periodically is usually better. Do you want to disable peer login expiration?"
            confirmModal.confirm({
                icon: <ExclamationCircleOutlined/>,
                title: "Before you update your account settings.",
                width: 600,
                content: content,
                onOk() {
                    saveAccount(newValues)
                },
                onCancel() {
                },
            });
        } else {
            saveAccount(newValues)
        }
    }

    const saveAccount = (newValues: FormAccount) => {
        let accountToSave = createAccountToSave(newValues)
        dispatch(accountActions.updateAccount.request({
            getAccessTokenSilently: getTokenSilently,
            payload: accountToSave
        }))
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
                                                tooltip="Peer login expiration allows to periodically request re-authentication of peers that were added with the SSO login. You can disable the expiration per peer in the peers tab."
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
                                            <Form.Item>
                                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                                        href="https://netbird.io/docs/how-to-guides/periodic-authentication">Learn more about login expiration</Button>
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
            {confirmModalContextHolder}
        </>
    )
}

export default Settings;