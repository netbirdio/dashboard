import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import { actions as setupKeyActions } from '../store/setup-key';
import {
    Col,
    Row,
    Typography,
    Input,
    Space,
    Radio,
    Button, Drawer, Form, List, Divider
} from "antd";
import {RootState} from "typesafe-actions";
import {QuestionCircleFilled} from "@ant-design/icons";
import {SetupKey} from "../store/setup-key/types";
import {useAuth0} from "@auth0/auth0-react";
const { Text } = Typography;

const SetupKeyNew = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()
    const setupNewKeyVisible = useSelector((state: RootState) => state.setupKey.setupNewKeyVisible)
    const setupKey =  useSelector((state: RootState) => state.setupKey.setupKey)
    const createdSetupKey = useSelector((state: RootState) => state.setupKey.createdSetupKey)

    const [formSetupKey, setFormSetupKey] = useState({} as SetupKey)
    const [form] = Form.useForm()

    useEffect(() => {
        setFormSetupKey({ ...setupKey } as SetupKey)
        form.setFieldsValue(setupKey)
    }, [setupKey])

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                dispatch(setupKeyActions.createSetupKey.request({getAccessTokenSilently, payload: formSetupKey}))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };
    
    const setVisibleNewSetupKey = (status:boolean) => {
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

    const onChange = (data:any) => {
        setFormSetupKey({...formSetupKey, ...data})
    }


    return (
        <>
        {setupKey &&
        <Drawer
            title="New setup key"
            forceRender={true}
            // width={512}
            visible={setupNewKeyVisible}
            bodyStyle={{paddingBottom: 80}}
            onClose={onCancel}
            footer={
                <Space style={{display: 'flex', justifyContent: 'end'}}>
                    <Button disabled={createdSetupKey.loading} onClick={onCancel}>Cancel</Button>
                    <Button disabled={createdSetupKey.loading} type="primary" onClick={handleFormSubmit}>Create</Button>
                </Space>
            }
        >
            <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                <Row gutter={16}>
                    <Col span={24}>
                        <Form.Item
                            name="Name"
                            label="Name"
                            rules={[{required: true, message: 'Please enter key name'}]}
                        >
                            <Input placeholder="Please enter key name" autoComplete="off"/>
                        </Form.Item>
                    </Col>
                    <Col span={24}>
                        <Form.Item
                            name="Type"
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
                                href="https://docs.netbird.io/docs/overview/setup-keys" style={{color: 'rgb(07, 114, 128)'}}>Learn
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