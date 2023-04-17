import {useGetTokenSilently} from "../utils/token";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Button, Col, Divider, Form, Input, InputNumber, message, Modal, Row, Space, Typography} from "antd";
import {Container} from "./Container";
import {CheckOutlined, CopyOutlined, QuestionCircleFilled} from "@ant-design/icons";
import SyntaxHighlighter from "react-syntax-highlighter";
import React, {useEffect, useRef, useState} from "react";
import {actions as personalAccessTokenActions} from "../store/personal-access-token";
import {PersonalAccessTokenCreate} from "../store/personal-access-token/types";
import {copyToClipboard} from "../utils/common";

const {Title, Text, Paragraph} = Typography;

const ExpiresInDefault = 7
const styleNotification = {marginTop: 85}

const AddPATPopup = () => {
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const user = useSelector((state: RootState) => state.user.user)

    const addTokenModalOpen = useSelector((state: RootState) => state.personalAccessToken.newPersonalAccessTokenPopupVisible)
    const [confirmModal, confirmModalContextHolder] = Modal.useModal();
    const [showPlainToken, setShowPlainToken] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);
    const [plainToken, setPlainToken] = useState("")
    const inputNameRef = useRef<any>(null)
    const [form] = Form.useForm()

    const savedPersonalAccessToken = useSelector((state: RootState) => state.personalAccessToken.savedPersonalAccessToken);

    const onCopyClick = (text: string, copied: boolean) => {
        copyToClipboard(text)
        setTokenCopied(true)
        if (copied) {
            setTimeout(() => {
                onCopyClick(text, false)
            }, 2000)
        }
    }

    const onCancel = () => {
        setShowPlainToken(false)
        setTokenCopied(false)
        if (savedPersonalAccessToken.loading) return
        dispatch(personalAccessTokenActions.setPersonalAccessToken({
            user_id: "",
            name: "",
            expires_in: 7
        } as PersonalAccessTokenCreate))
        form.resetFields()
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenPopupVisible(false));
        dispatch(personalAccessTokenActions.setSavedPersonalAccessToken({...savedPersonalAccessToken, success: false}));
        dispatch(personalAccessTokenActions.resetSavedPersonalAccessToken(null))
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let personalAccessTokenToSave = {
                    user_id: user.id,
                    name: values.name,
                    expires_in: values.expires_in,
                } as PersonalAccessTokenCreate
                dispatch(personalAccessTokenActions.savePersonalAccessToken.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: personalAccessTokenToSave
                }))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const createKey = 'saving';
    useEffect(() => {
        if (savedPersonalAccessToken.loading) {
            message.loading({content: 'Saving...', key: createKey, duration: 0, style: styleNotification});
        } else if (savedPersonalAccessToken.success) {
            message.destroy(createKey)
            setPlainToken(savedPersonalAccessToken.data.plain_token)
            setShowPlainToken(true)
            form.resetFields()
        } else if (savedPersonalAccessToken.error) {
            message.error({
                content: 'Failed to create personal access token. You might not have enough permissions.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(personalAccessTokenActions.setNewPersonalAccessTokenPopupVisible(false));
            setShowPlainToken(false)
            setTokenCopied(false)
            dispatch(personalAccessTokenActions.setSavedPersonalAccessToken({...savedPersonalAccessToken, error: null}));
            dispatch(personalAccessTokenActions.resetSavedPersonalAccessToken(null))
        }
    }, [savedPersonalAccessToken])

    return (
        <>
            <Modal
                open={addTokenModalOpen}
                onCancel={onCancel}
                footer={
                    <Space style={{display: 'flex', justifyContent: 'end'}}>
                        <Button disabled={savedPersonalAccessToken.loading} onClick={onCancel}>{showPlainToken ? "Close" : "Cancel"}</Button>
                        <Button type="primary" disabled={showPlainToken}
                                onClick={handleFormSubmit}>{"Create"}</Button>
                    </Space>
                }
                width={780}
            >
                <Container style={{textAlign: "center"}}>
                    <Paragraph
                        style={{textAlign: "center", whiteSpace: "pre-line", fontSize: "2em"}}>
                        {showPlainToken ? "Token created successfully!" : "Create new Personal Access Token"}
                    </Paragraph>
                    <Paragraph type={"secondary"}
                               style={{
                                   textAlign: "center",
                                   whiteSpace: "pre-line",
                                   marginTop: "-15px",
                                   paddingBottom: "25px",
                               }}>
                        {showPlainToken ? "You will only see this token once," + "\n" + "so copy it and store it in a secure location." : "This token can be used to authenticate against NetBird's Public API."}
                    </Paragraph>
                    {!showPlainToken && <Form layout="vertical" hideRequiredMark form={form}
                                              initialValues={{
                                                  expires_in: ExpiresInDefault,
                                              }}
                                              style={{paddingLeft: "80px", paddingRight: "80px"}}
                    >
                        <Row gutter={16}>
                            <Col span={24}>
                                <Divider style={{marginTop: "0px"}}></Divider>
                                <Row align="top">
                                    <Col flex="auto">
                                        <Form.Item
                                            name="name"
                                            label={
                                                <Text style={{color: "gray"}}><b style={{color: "black"}}>Name</b> (Set a name to identify the token.)</Text>
                                            }
                                            rules={[{
                                                required: true,
                                                message: 'Please add a name for this personal access token',
                                                whitespace: true
                                            }]}
                                        >
                                            <Input
                                                placeholder={""}
                                                ref={inputNameRef}
                                                autoComplete="off"/>
                                        </Form.Item>
                                    </Col>
                                </Row>
                                <Divider style={{marginTop: "0px"}}></Divider>
                            </Col>
                            <Col span={24} style={{textAlign: "left"}}>
                                <Form.Item
                                    name="expires_in"
                                    label={
                                        <Text style={{color: "gray"}}><b style={{color: "black"}}>Expires</b> (Set the amount of days the token should be valid.)</Text>
                                    }
                                    rules={[{
                                        type: 'number',
                                        min: 1,
                                        max: 356,
                                        message: 'The expiration should be set between 1 and 365 days'
                                    }]}>
                                    <InputNumber/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Divider style={{marginTop: "0px"}}></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank" disabled={true}
                                        href="https://netbird.io/docs/overview/personal-access-tokens">Learn more about personal access tokens</Button>
                            </Col>
                        </Row>
                    </Form>}
                    {showPlainToken && <Space className="nb-code" direction="vertical" size="middle">
                        <Row>
                            <>
                                <Space className="nb-code" direction="vertical" size="small" style={{display: "flex", fontSize: ".85em"}}>
                                    <SyntaxHighlighter language="bash">
                                        {plainToken}
                                    </SyntaxHighlighter>
                                </Space>
                                { !tokenCopied ? (
                                    <Button type="text" size="middle" className="btn-copy-code" icon={<CopyOutlined/>}
                                            style={{color: "rgb(107, 114, 128)", marginTop: "-1px"}}
                                            onClick={() => onCopyClick(plainToken, true)}/>
                                ): (
                                    <Button type="text" size="middle"  className="btn-copy-code" icon={<CheckOutlined/>}
                                            style={{color: "green", marginTop: "-1px"}}/>
                                )}
                            </>
                        </Row>
                    </Space>}
                </Container>
            </Modal>
            {confirmModalContextHolder}
        </>
    )
}

export default AddPATPopup