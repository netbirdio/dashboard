import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as personalAccessTokenActions} from '../store/personal-access-token';
import {actions as userActions} from '../store/user';
import {Container} from "../components/Container";
import {
    Alert,
    Button,
    Card,
    Col, Divider,
    Dropdown, Form,
    Input, InputNumber,
    Menu,
    message,
    Modal,
    Radio,
    RadioChangeEvent,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography
} from "antd";
import {filter} from "lodash"
import {copyToClipboard, timeAgo} from "../utils/common";
import {CheckOutlined, CopyOutlined, ExclamationCircleOutlined, QuestionCircleFilled} from "@ant-design/icons";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";
import {usePageSizeHelpers} from "../utils/pageSize";
import {PersonalAccessToken, PersonalAccessTokenCreate, SpecificPAT} from "../store/personal-access-token/types";
import {User} from "../store/user/types";
import {useOidcUser} from "@axa-fr/react-oidc";
import SyntaxHighlighter from "react-syntax-highlighter";

const {Title, Text, Paragraph} = Typography;
const {Column} = Table;
const {confirm} = Modal;

const ExpiresInDefault = 7

interface TokenDataTable extends PersonalAccessToken {
    key: string
    status: String
}

export const SettingsPersonal = () => {
    const {onChangePageSize,pageSizeOptions,pageSize} = usePageSizeHelpers()
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const users = useSelector((state: RootState) => state.user.data);
    const personalAccessTokens = useSelector((state: RootState) => state.personalAccessToken.data);
    const failed = useSelector((state: RootState) => state.personalAccessToken.failed);
    const loading = useSelector((state: RootState) => state.personalAccessToken.loading);
    const deletedPersonalAccessToken = useSelector((state: RootState) => state.personalAccessToken.deletedPersonalAccessToken);
    const savedPersonalAccessToken = useSelector((state: RootState) => state.personalAccessToken.savedPersonalAccessToken);

    const personalAccessToken = useSelector((state: RootState) => state.personalAccessToken.personalAccessToken)
    const inputNameRef = useRef<any>(null)

    const [textToSearch, setTextToSearch] = useState('');
    const [dataTable, setDataTable] = useState([] as TokenDataTable[]);

    const optionsValidAll = [ {label: 'All', value: 'all'}, {label: 'Valid', value: 'valid'}, {label: 'Expired', value: 'expired'}]
    const [optionValidAll, setOptionValidAll] = useState('all');
    const onChangeValidAll = ({target: {value}}: RadioChangeEvent) => {
        setOptionValidAll(value)
    }

    const [formPersonalAccessToken, setFormPersonalAccessToken] = useState({} as PersonalAccessTokenCreate)
    const [form] = Form.useForm()

    const {oidcUser} = useOidcUser();

    const [personalAccessTokenToDelete, setPersonalAccessTokenToDelete] = useState(null as PersonalAccessToken | null);

    const [addTokenModalOpen, setNewTokenModalOpen] = useState(false);
    const [showPlainToken, setShowPlainToken] = useState(false);
    const [tokenCopied, setTokenCopied] = useState(false);
    const [plainToken, setPlainToken] = useState("")

    const [confirmModal, confirmModalContextHolder] = Modal.useModal();

    const styleNotification = {marginTop: 85}

    const itemsMenuAction = [
        {
            key: "delete",
            label: (<Button type="text" onClick={() => showConfirmDelete()}>Delete</Button>)
        },

    ]
    const actionsMenu = (<Menu items={itemsMenuAction}></Menu>)

    useEffect(() => {
        if (!personalAccessToken) return
        setFormPersonalAccessToken(personalAccessToken)
        form.setFieldsValue(personalAccessToken)
    }, [personalAccessToken])

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])

    const onChange = (data: any) => {
        setFormPersonalAccessToken({...formPersonalAccessToken, ...data})
    }

    useEffect(() => {
        if(oidcUser) {
            dispatch(personalAccessTokenActions.getPersonalAccessTokens.request({
                getAccessTokenSilently: getAccessTokenSilently,
                payload:  oidcUser.sub}));
        }
    }, [oidcUser])

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(filterDataTable(transformTokenTable(personalAccessTokens, users)))
    }, [personalAccessTokens, textToSearch, users, optionValidAll])

    const deleteKey = 'deleting';
    useEffect(() => {
        if (deletedPersonalAccessToken.loading) {
            message.loading({content: 'Deleting...', key: deleteKey, style: styleNotification});
        } else if (deletedPersonalAccessToken.success) {
            message.success({
                content: 'Personal access token has been successfully removed.',
                key: deleteKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(personalAccessTokenActions.setDeletePersonalAccessToken({...deletedPersonalAccessToken, success: false}))
            dispatch(personalAccessTokenActions.resetDeletedPersonalAccessToken(null))
        } else if (deletedPersonalAccessToken.error) {
            message.error({
                content: 'Failed to delete personal access token. You might not have enough permissions.',
                key: deleteKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(personalAccessTokenActions.setDeletePersonalAccessToken({...deletedPersonalAccessToken, error: null}))
            dispatch(personalAccessTokenActions.resetDeletedPersonalAccessToken(null))
        }
    }, [deletedPersonalAccessToken])

    const createKey = 'saving';
    useEffect(() => {
        if (savedPersonalAccessToken.loading) {
            message.loading({content: 'Saving...', key: createKey, duration: 0, style: styleNotification});
        } else if (savedPersonalAccessToken.success) {
            message.destroy(createKey)
            setPlainToken(savedPersonalAccessToken.data.plain_token)
            setShowPlainToken(true)
        } else if (savedPersonalAccessToken.error) {
            message.error({
                content: 'Failed to create personal access token. You might not have enough permissions.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            setNewTokenModalOpen(false)
            setShowPlainToken(false)
            setTokenCopied(false)
            dispatch(personalAccessTokenActions.setSavedPersonalAccessToken({...savedPersonalAccessToken, error: null}));
            dispatch(personalAccessTokenActions.resetSavedPersonalAccessToken(null))
        }
    }, [savedPersonalAccessToken])

    const transformTokenTable = (d: PersonalAccessToken[], u: User[]): TokenDataTable[] => {
        if(!d) {
            return []
        }
        return d.map(p => ({
            key: p.id,
            status: Date.parse(p.expiration_date) > Date.now() ? "valid" : "expired",
            ...p} as TokenDataTable))
    }

    const filterDataTable = (f: TokenDataTable[]): TokenDataTable[] => {
        const t = textToSearch.toLowerCase().trim()
        switch (optionValidAll) {
            case "valid":
                f = filter(f, (_f: TokenDataTable) => _f.status === "valid")
                break
            case "expired":
                f = filter(f, (_f: TokenDataTable) => _f.status === "expired")
                break
            default:
                break
        }
        f = filter(f, (_f: TokenDataTable) =>
            (_f.name.toLowerCase().includes(t) || _f.status.toLowerCase().includes(t) || t === "")
        ) as TokenDataTable[]
        return f
    }

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
         setDataTable(filterDataTable(transformTokenTable(personalAccessTokens, users)))
    }

    const showConfirmDelete = () => {
        confirmModal.confirm({
            icon: <ExclamationCircleOutlined/>,
            width: 600,
            content: <Space direction="vertical" size="small">
                {personalAccessTokenToDelete &&
                    <>
                        <Title level={5}>Delete token "{personalAccessTokenToDelete ? personalAccessTokenToDelete.name : ''}"</Title>
                        <Paragraph>Are you sure you want to delete this token?</Paragraph>
                    </>
                }
            </Space>,
            onOk() {
                dispatch(personalAccessTokenActions.deletePersonalAccessToken.request({
                    getAccessTokenSilently: getAccessTokenSilently,
                    payload: {
                        user_id: oidcUser.sub,
                        id: personalAccessTokenToDelete ? personalAccessTokenToDelete.id : null,
                        name: personalAccessTokenToDelete ? personalAccessTokenToDelete.name : null,
                    } as SpecificPAT
                }));
            },
            onCancel() {
                setPersonalAccessTokenToDelete(null);
            },
        });
    }

    const onClickAddNewPersonalAccessToken = () => {
        setNewTokenModalOpen(true)
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenVisible(true));
        dispatch(personalAccessTokenActions.setPersonalAccessToken({
            user_id: "",
            name: "",
            expires_in: 7
        } as PersonalAccessTokenCreate))
    }

    const onCancel = () => {
        setNewTokenModalOpen(false)
        setShowPlainToken(false)
        setTokenCopied(false)
        if (savedPersonalAccessToken.loading) return
        dispatch(personalAccessTokenActions.setPersonalAccessToken({
            user_id: "",
            name: "",
            expires_in: 0
        } as PersonalAccessTokenCreate))
        setFormPersonalAccessToken({} as PersonalAccessTokenCreate)
        setVisibleNewSetupKey(false)
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenVisible(false));
        dispatch(personalAccessTokenActions.setSavedPersonalAccessToken({...savedPersonalAccessToken, success: false}));
        dispatch(personalAccessTokenActions.resetSavedPersonalAccessToken(null))
    }

    const setVisibleNewSetupKey = (status: boolean) => {
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenVisible(status));
    }

    const createPersonalAccessTokenToSave = (): PersonalAccessTokenCreate => {
        console.log(formPersonalAccessToken.name)
        return {
            user_id: oidcUser.sub,
            name: formPersonalAccessToken.name,
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

    const onCopyClick = (text: string, copied: boolean) => {
        copyToClipboard(text)
        setTokenCopied(true)
        if (copied) {
            setTimeout(() => {
                onCopyClick(text, false)
            }, 2000)
        }
    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Personal Access Tokens</Title>
                        <Paragraph>Personal Access Tokens can be used to authenticate against NetBird's Public API.</Paragraph>
                        <Space direction="vertical" size="large" style={{display: 'flex'}}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable}
                                           placeholder="Search..." onChange={onChangeTextToSearch}/>
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
                                        <Radio.Group
                                            options={optionsValidAll}
                                            onChange={onChangeValidAll}
                                            value={optionValidAll}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                        <Select value={pageSize.toString()} options={pageSizeOptions}
                                                onChange={onChangePageSize} className="select-rows-per-page-en"/>
                                    </Space>
                                </Col>
                                <Col xs={24}
                                     sm={24}
                                     md={5}
                                     lg={5}
                                     xl={5}
                                     xxl={5} span={5}>
                                    <Row justify="end">
                                        <Col>
                                            <Button type="primary" onClick={onClickAddNewPersonalAccessToken}>Add Token</Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.message} description={failed.data ? failed.data.message : " "} type="error" showIcon
                                       closable/>
                            }
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{
                                        pageSize,
                                        showSizeChanger: false,
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} personal access tokens`)
                                    }}
                                    className="card-table"
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}
                                            render={(text, record, index) => {
                                                return <Text strong>{text}</Text>
                                            }}
                                    />

                                    <Column title="Last Used" dataIndex="last_used"
                                            sorter={(a, b) => ((a as any).last_used.localeCompare((b as any).last_used))}
                                            render={(text, record, index) => {
                                                return (record as TokenDataTable).last_used === (record as TokenDataTable).created_at ? "never" : timeAgo(text)
                                            }}
                                    />
                                    <Column title="Created" dataIndex="created_at"
                                            sorter={(a, b) => ((a as any).created_at.localeCompare((b as any).created_at))}
                                            render={(text, record, index) => {
                                                return <Text>{timeAgo(text)}</Text>
                                            }}
                                            defaultSortOrder='descend'
                                    />

                                    <Column title="Status" dataIndex="status"
                                            sorter={(a, b) => ((a as any).status.localeCompare((b as any).status))}
                                            render={(text, record, index) => {
                                                return (text === 'valid') ? <Tag color="green">{text}</Tag> :
                                                    <Tag color="red">{text}</Tag>
                                            }}
                                    />

                                    <Column title="Expires" dataIndex="expiration_date"
                                            sorter={(a, b) => ((a as any).expiration_date.localeCompare((b as any).expiration_date))}
                                            render={(text, record, index) => {
                                                return timeAgo(text)
                                            }}
                                    />

                                    <Column title="" align="center"
                                            render={(text, record, index) => {
                                                return (
                                                    <Dropdown.Button type="text" overlay={actionsMenu}
                                                                     trigger={["click"]}
                                                                     onOpenChange={visible => {
                                                                         if (visible) setPersonalAccessTokenToDelete(record as PersonalAccessToken)
                                                                     }}></Dropdown.Button>)
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Space>
                    </Col>
                </Row>

            </Container>
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
                    {!showPlainToken && <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}
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
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
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
                                    <Button type="text" size="large" className="btn-copy-code" icon={<CopyOutlined/>}
                                            style={{color: "rgb(107, 114, 128)"}}
                                            onClick={() => onCopyClick(plainToken, true)}/>
                                ): (
                                    <Button type="text" size="large" className="btn-copy-code" icon={<CheckOutlined/>}
                                            style={{color: "green"}}/>
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

export default SettingsPersonal;