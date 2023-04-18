import {useGetTokenSilently} from "../../utils/token";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Button, Col, Divider, Form, Input, InputNumber, message, Modal, Row, Space, Typography} from "antd";
import {Container} from "../Container";
import {CheckOutlined, CopyOutlined, QuestionCircleFilled} from "@ant-design/icons";
import SyntaxHighlighter from "react-syntax-highlighter";
import React, {useEffect, useRef, useState} from "react";
import {actions as personalAccessTokenActions} from "../../store/personal-access-token";
import {PersonalAccessTokenCreate} from "../../store/personal-access-token/types";
import {copyToClipboard} from "../../utils/common";

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
                        {!showPlainToken && <Button disabled={savedPersonalAccessToken.loading} onClick={onCancel}>{"Cancel"}</Button>}
                        {!showPlainToken && <Button type="primary" disabled={showPlainToken}
                                onClick={handleFormSubmit}>{"Create token"}</Button>}
                        {showPlainToken && <Button type="primary" disabled={!showPlainToken} onClick={onCancel}>Done</Button>}
                    </Space>
                }
                width={460}
            >
                <Container style={{textAlign: "start"}}>
                    <Paragraph
                        style={{textAlign: "start", whiteSpace: "pre-line", fontSize: "18px", fontWeight: "500"}}>
                        {showPlainToken ? "Token created successfully!" : "Create a Personal Access Token"}
                    </Paragraph>
                    {!showPlainToken && <Paragraph type={"secondary"}
                               style={{
                                   textAlign: "start",
                                   fontSize: "14px",
                                   whiteSpace: "pre-line",
                                   marginTop: "-15px",
                                   paddingBottom: "25px",
                               }}>
                        {"This token can be used to authenticate against" + "\n" + "NetBird's Public API."}
                    </Paragraph>}
                    {showPlainToken && <Paragraph type={"secondary"} style={{
                        textAlign: "start",
                        fontSize: "14px",
                        whiteSpace: "pre-line",
                        marginTop: "40px",
                    }}>{"This token will not be shown again, so be sure to copy it and" + "\n" + "store in a secure location."}</Paragraph>}
                    {!showPlainToken && <Form layout="vertical" hideRequiredMark form={form}
                                              initialValues={{
                                                  expires_in: ExpiresInDefault,
                                              }}
                    >
                        <Row gutter={16}>
                            <Col span={24}>
                                <Row align="top">
                                    <Col flex="auto">
                                        <Paragraph style={{fontSize: "16px", fontWeight: "500", marginTop: "-8px"}}>Token name</Paragraph>
                                        <Paragraph type={"secondary"} style={{fontSize: "14px", marginTop: "-18px"}}>Create a name to identify the token easily</Paragraph>
                                        <Form.Item
                                            name="name"
                                            style={{marginTop: "-10px"}}
                                            rules={[{
                                                required: true,
                                                message: 'Please add a name for this personal access token',
                                                whitespace: true
                                            }]}
                                        >
                                            <Input
                                                placeholder={"for example \"Berlin Office\""}
                                                ref={inputNameRef}
                                                autoComplete="off"/>
                                        </Form.Item>
                                    </Col>
                                </Row>
                            </Col>
                            <Col span={24} style={{textAlign: "left"}}>
                                <Paragraph style={{fontSize: "16px", fontWeight: "500"}}>Expires in</Paragraph>
                                <Paragraph type={"secondary"} style={{fontSize: "14px", marginTop: "-18px"}}>Number of days this token ins valid for</Paragraph>
                                <Form.Item
                                    name="expires_in"
                                    style={{marginTop: "-10px"}}
                                    rules={[{
                                        type: 'number',
                                        min: 1,
                                        max: 365,
                                        message: 'The expiration should be set between 1 and 365 days'
                                    }]}>
                                    <InputNumber addonAfter=" Days" style={{maxWidth: "150px"}}/>
                                </Form.Item>
                                <Paragraph type={"secondary"} style={{fontSize: "14px", marginTop: "-18px"}}>Should be between 1 and 365 days</Paragraph>
                            </Col>
                            {/*<Col span={24}>*/}
                            {/*    <Button icon={<QuestionCircleFilled/>} type="link" target="_blank" disabled={true} style={{marginTop: "20px", marginBottom: "20px"}}*/}
                            {/*            href="https://netbird.io/docs/overview/personal-access-tokens">Learn more about personal access tokens</Button>*/}
                            {/*</Col>*/}
                        </Row>
                    </Form>}
                    {showPlainToken &&
                                <Input style={{marginTop: "-15px", marginBottom: "25px"}} suffix={
                                    !tokenCopied ? <Button type="text" size="middle" className="btn-copy-code" icon={<CopyOutlined/>}
                                    style={{color: "rgb(107, 114, 128)", marginTop: "-1px"}}
                                    onClick={() => onCopyClick(plainToken, true)}/>
                                    : <Button type="text" size="middle"  className="btn-copy-code" icon={<CheckOutlined/>}
                                              style={{color: "green", marginTop: "-1px"}}/>
                                }
                                       defaultValue={plainToken}
                                       readOnly={true}
                                ></Input>}
                </Container>
            </Modal>
            {confirmModalContextHolder}
        </>
    )
}

export default AddPATPopup