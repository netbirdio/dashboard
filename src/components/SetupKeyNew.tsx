import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {actions as setupKeyActions} from '../store/setup-key';
import {Button, Col, Divider, Drawer, Form, Input, List, Radio, Row, Space, Typography} from "antd";
import {RootState} from "typesafe-actions";
import {CloseOutlined, EditOutlined, QuestionCircleFilled} from "@ant-design/icons";
import {SetupKey} from "../store/setup-key/types";
import {useOidcAccessToken} from "@axa-fr/react-oidc";
import {Header} from "antd/es/layout/layout";

const {Text} = Typography;

interface FormSetupKey extends SetupKey {
}


const SetupKeyNew = () => {
    const {accessToken} = useOidcAccessToken()
    const dispatch = useDispatch()
    const setupNewKeyVisible = useSelector((state: RootState) => state.setupKey.setupNewKeyVisible)
    const setupKey = useSelector((state: RootState) => state.setupKey.setupKey)
    const createdSetupKey = useSelector((state: RootState) => state.setupKey.createdSetupKey)
    const [editName, setEditName] = useState(false)
    const inputNameRef = useRef<any>(null)

    const [formSetupKey, setFormSetupKey] = useState({} as SetupKey)
    const [form] = Form.useForm()

    useEffect(() => {
        if (editName) inputNameRef.current!.focus({
            cursor: 'end',
        });
    }, [editName]);

    useEffect(() => {
        if (!setupKey) return
        const fSetupKey = {
            ...setupKey,
        } as FormSetupKey
        setFormSetupKey(fSetupKey)
        form.setFieldsValue(setupKey)
    }, [setupKey])

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                dispatch(setupKeyActions.createSetupKey.request({
                    getAccessTokenSilently: accessToken,
                    payload: formSetupKey
                }))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const setVisibleNewSetupKey = (status: boolean) => {
        dispatch(setupKeyActions.setSetupNewKeyVisible(status));
    }

    const onCancel = () => {
        if (createdSetupKey.loading) return
        dispatch(setupKeyActions.setSetupKey({
            name: '',
            type: 'reusable'
        } as SetupKey))
        setVisibleNewSetupKey(false)
    }

    const onChange = (data: any) => {
        setFormSetupKey({...formSetupKey, ...data})
    }

    const toggleEditName = (status: boolean) => {
        setEditName(status);
    }

    return (
        <>
            {setupKey &&
                <Drawer
                    forceRender={true}
                    headerStyle={{display: "none"}}
                    visible={setupNewKeyVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button disabled={createdSetupKey.loading} onClick={onCancel}>Cancel</Button>
                            <Button disabled={createdSetupKey.loading} type="primary"
                                    onClick={handleFormSubmit}>Create</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                    <Row align="top">
                                        <Col flex="none" style={{display: "flex"}}>
                                            {!editName && setupKey.id &&
                                                <button type="button" aria-label="Close" className="ant-drawer-close"
                                                        style={{paddingTop: 3}}
                                                        onClick={onCancel}>
                                                    <span role="img" aria-label="close"
                                                          className="anticon anticon-close">
                                                        <CloseOutlined size={16}/>
                                                    </span>
                                                </button>
                                            }
                                        </Col>
                                        <Col flex="auto">
                                            {!editName && setupKey.id && formSetupKey.name ? (
                                                <div className={"access-control input-text ant-drawer-title"}
                                                     onClick={() => toggleEditName(true)}>{formSetupKey.name ? formSetupKey.name : setupKey.name}
                                                    <EditOutlined/></div>
                                            ) : (
                                                <Form.Item
                                                    name="name"
                                                    label="Name"
                                                    rules={[{
                                                        required: true,
                                                        message: 'Please add a new name for this peer',
                                                        whitespace: true
                                                    }]}
                                                    style={{display: 'flex'}}
                                                >
                                                    <Input
                                                        placeholder={setupKey.name}
                                                        ref={inputNameRef}
                                                        onPressEnter={() => toggleEditName(false)}
                                                        onBlur={() => toggleEditName(false)}
                                                        autoComplete="off"/>
                                                </Form.Item>)}
                                        </Col>
                                    </Row>
                                </Header>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="type"
                                    label="Type"
                                    rules={[{required: true, message: 'Please enter key type'}]}
                                    style={{display: 'flex'}}
                                >
                                    <Radio.Group style={{display: 'flex'}}>
                                        <Space direction="vertical" style={{flex: 1}}>
                                            <List
                                                size="large"
                                                bordered
                                            >
                                                <List.Item>
                                                    <Radio value={"reusable"}>
                                                        <Space direction="vertical" size="small">
                                                            <Text strong>Reusable</Text>
                                                            <Text>This type of a setup key allows to setup multiple
                                                                machine</Text>
                                                        </Space>
                                                    </Radio>
                                                </List.Item>
                                                <List.Item>
                                                    <Radio value={"one-off"}>
                                                        <Space direction="vertical" size="small">
                                                            <Text strong>One-off</Text>
                                                            <Text>This key can be used only once</Text>
                                                        </Space>
                                                    </Radio>
                                                </List.Item>
                                            </List>

                                        </Space>
                                    </Radio.Group>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Divider></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                        href="https://docs.netbird.io/docs/overview/setup-keys"
                                        style={{color: 'rgb(07, 114, 128)'}}>Learn
                                    more about setup keys</Button>
                            </Col>
                        </Row>
                    </Form>

                </Drawer>
            }
        </>
    )
}

export default SetupKeyNew