import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {
    Button,
    Card,
    Col,
    Form,
    message,
    Select,
    Space,
    Typography,
} from "antd";
import {useGetAccessTokenSilently} from "../utils/token";
import {useGetGroupTagHelpers} from "../utils/groups";
import {actions as dnsSettingsActions} from '../store/dns-settings';
import {DNSSettings, DNSSettingsToSave} from "../store/dns-settings/types";
import {actions as nsGroupActions} from "../store/nameservers";

const {Paragraph} = Typography;
const styleNotification = {marginTop: 85}

export const DNSSettingsForm = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const {
        tagRender,
        handleChangeTags,
        dropDownRender,
        optionRender,
        tagGroups,
        getExistingAndToCreateGroupsLists,
        getGroupNamesFromIDs,
        selectValidatorEmptyStrings
    } = useGetGroupTagHelpers()

    const dnsSettings = useSelector((state: RootState) => state.dnsSettings.dnsSettings)
    const dnsSettingsData = useSelector((state: RootState) => state.dnsSettings.data)
    const savedDNSSettings = useSelector((state: RootState) => state.dnsSettings.savedDNSSettings)
    const loading = useSelector((state: RootState) => state.dnsSettings.loading);


    const [form] = Form.useForm()

    useEffect(() => {
        dispatch(dnsSettingsActions.getDNSSettings.request({
            getAccessTokenSilently: getAccessTokenSilently,
            payload: null
        }));
    }, []);

    useEffect(() => {
        if (!dnsSettingsData) return
        dispatch(dnsSettingsActions.setDNSSettings({
            disabled_management_groups: getGroupNamesFromIDs(dnsSettingsData.disabled_management_groups),
        }))
    }, [dnsSettingsData])

    useEffect(() => {
        form.setFieldsValue(dnsSettings)
    }, [dnsSettings])

    const createKey = 'saving';
    useEffect(() => {
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
    }, [savedDNSSettings])

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let dnsSettingsToSave = createDNSSettingsToSave(values)
                dispatch(dnsSettingsActions.saveDNSSettings.request({
                    getAccessTokenSilently:getAccessTokenSilently,
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
                <Paragraph>Manage your account's DNS settings</Paragraph>
                <Col>
                    <Form
                        name="basic"
                        autoComplete="off"
                        form={form}
                        onFinish={handleFormSubmit}
                    >
                        <Space direction={"vertical"}
                               style={{ display: 'flex' }}>
                            <Card
                                title="DNS Management"
                                loading={loading}
                            >
                                <Form.Item
                                    label="Disable DNS management for these groups"
                                    name="disabled_management_groups"
                                    tooltip="Peers in these groups will have their DNS management disabled and require manual configuration for domain name resolution"
                                    rules={[{validator: selectValidatorEmptyStrings}]}
                                >
                                    <Select mode="tags"
                                            style={{width: '100%'}}
                                            tagRender={tagRender}
                                            onChange={handleChangeTags}
                                            dropdownRender={dropDownRender}
                                    >
                                        {
                                            tagGroups.map(m =>
                                                <Select.Option key={m}>{optionRender(m)}</Select.Option>
                                            )
                                        }
                                    </Select>
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

export default DNSSettingsForm;