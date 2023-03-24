import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {actions as personalAccessTokenActions} from '../store/personal-access-token';
import {
    Button,
    Col,
    Divider,
    Drawer,
    Form,
    Input,
    InputNumber,
    Row,
    Space,
    Typography
} from "antd";
import {RootState} from "typesafe-actions";
import {QuestionCircleFilled} from "@ant-design/icons";
import {Header} from "antd/es/layout/layout";
import {useGetAccessTokenSilently} from "../utils/token";
import {PersonalAccessTokenCreate} from "../store/personal-access-token/types";
import {actions as userActions} from "../store/user";
import {useOidcUser} from "@axa-fr/react-oidc";

const {Text} = Typography;

const ExpiresInDefault = 7

const PersonalAccessTokenNew = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()
    const newPersonalAccessTokenVisible = useSelector((state: RootState) => state.personalAccessToken.newPersonalAccessTokenVisible)
    const personalAccessToken = useSelector((state: RootState) => state.personalAccessToken.personalAccessToken)
    const savedPersonalAccessToken = useSelector((state: RootState) => state.personalAccessToken.savedPersonalAccessToken)
    const inputNameRef = useRef<any>(null)

    const [formPersonalAccessToken, setFormPersonalAccessToken] = useState({} as PersonalAccessTokenCreate)
    const [form] = Form.useForm()

    const {oidcUser} = useOidcUser();

    useEffect(() => {
        if (!personalAccessToken) return

        setFormPersonalAccessToken(personalAccessToken)
        form.setFieldsValue(personalAccessToken)
    }, [personalAccessToken, form])

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    })

    const createPersonalAccessTokenToSave = (): PersonalAccessTokenCreate => {
        return {
            user_id: oidcUser.sub,
            description: formPersonalAccessToken.description,
            expires_in: formPersonalAccessToken.expires_in,
        } as PersonalAccessTokenCreate
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let personalAccessTokenToSave = createPersonalAccessTokenToSave()
                dispatch(personalAccessTokenActions.savePersonalAccessToken.request({
                    getAccessTokenSilently: getAccessTokenSilently,
                    payload: personalAccessTokenToSave
                }))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const setVisibleNewSetupKey = (status: boolean) => {
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenVisible(status));
    }

    const onCancel = () => {
        if (savedPersonalAccessToken.loading) return
        dispatch(personalAccessTokenActions.setPersonalAccessToken({
            user_id: "",
            description: "",
            expires_in: 0
        } as PersonalAccessTokenCreate))
        setFormPersonalAccessToken({} as PersonalAccessTokenCreate)
        setVisibleNewSetupKey(false)
    }

    const onChange = (data: any) => {
        setFormPersonalAccessToken({...formPersonalAccessToken, ...data})
    }


    return (
        <>
            {personalAccessToken &&
                <Drawer
                    forceRender={true}
                    headerStyle={{display: "none"}}
                    open={newPersonalAccessTokenVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button disabled={savedPersonalAccessToken.loading} onClick={onCancel}>Cancel</Button>
                            <Button type="primary" disabled={savedPersonalAccessToken.loading}
                                    onClick={handleFormSubmit}>{"Create"}</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}
                          initialValues={{
                              expires_in: ExpiresInDefault,
                          }}
                    >
                        <Row gutter={16}>
                            <Col span={24}>
                                <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                    <Row align="top">
                                        <Col flex="auto">
                                            <Form.Item
                                                name="description"
                                                label="Description"
                                                rules={[{
                                                    required: true,
                                                    message: 'Please add a new description for this personal access token',
                                                    whitespace: true
                                                }]}
                                            >
                                                <Input
                                                    placeholder={personalAccessToken.description}
                                                    ref={inputNameRef}
                                                    autoComplete="off"/>
                                            </Form.Item>
                                        </Col>
                                    </Row>
                                </Header>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="expires_in"
                                    label="Expires in"
                                    rules={[{
                                        type: 'number',
                                        min: 1,
                                        max: 356,
                                        message: 'The expiration should be set between 1 and 365 days'
                                }]}>
                                    <InputNumber/>
                                </Form.Item>
                                <Text> Days</Text>
                            </Col>
                            <Col span={24}>
                                {savedPersonalAccessToken.data &&
                                    <Text>{savedPersonalAccessToken.data.plain_token}</Text>
                                }
                            </Col>
                            <Col span={24}>
                                <Divider></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                        href="https://netbird.io/docs/overview/setup-keys">Learn more about setup keys</Button>
                            </Col>
                        </Row>
                    </Form>

                </Drawer>
            }
        </>
    )
}

export default PersonalAccessTokenNew