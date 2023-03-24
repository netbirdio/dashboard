import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as personalAccessTokenActions} from '../store/personal-access-token';
import {actions as userActions} from '../store/user';
import {Container} from "../components/Container";
import {
    Alert,
    Button,
    Card,
    Col,
    Dropdown,
    Input,
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
import {timeAgo} from "../utils/common";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";
import {usePageSizeHelpers} from "../utils/pageSize";
import {PersonalAccessToken, PersonalAccessTokenCreate, SpecificPAT} from "../store/personal-access-token/types";
import PersonalAccessTokenNew from "../components/PersonalAccessTokenNew";
import {User} from "../store/user/types";
import {useOidcUser} from "@axa-fr/react-oidc";

const {Title, Text, Paragraph} = Typography;
const {Column} = Table;
const {confirm} = Modal;

interface TokenDataTable extends PersonalAccessToken {
    key: string
    user_name: String
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

    const [textToSearch, setTextToSearch] = useState('');
    const [dataTable, setDataTable] = useState([] as TokenDataTable[]);

    const optionsValidAll = [ {label: 'All', value: 'all'}, {label: 'Valid', value: 'valid'}, {label: 'Expired', value: 'expired'}]
    const [optionValidAll, setOptionValidAll] = useState('all');
    const onChangeValidAll = ({target: {value}}: RadioChangeEvent) => {
        setOptionValidAll(value)
    }

    const {oidcUser} = useOidcUser();

    const [personalAccessTokenToDelete, setPersonalAccessTokenToDelete] = useState(null as PersonalAccessToken | null);

    const styleNotification = {marginTop: 85}

    const itemsMenuAction = [
        {
            key: "delete",
            label: (<Button type="text" onClick={() => showConfirmDelete()}>Delete</Button>)
        },

    ]
    const actionsMenu = (<Menu items={itemsMenuAction}></Menu>)

    useEffect(() => {
        if(oidcUser) {
            dispatch(personalAccessTokenActions.getPersonalAccessTokens.request({
                getAccessTokenSilently: getAccessTokenSilently,
                payload:  oidcUser.sub}));
        }
    }, [oidcUser])

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    })

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
            if(savedPersonalAccessToken.data.plain_token) {
                alert("Token created successfully\nYou will only see this token once so copy it before closing this window.\nToken: " + savedPersonalAccessToken.data.plain_token)
                dispatch(personalAccessTokenActions.setNewPersonalAccessTokenVisible(false));
                dispatch(personalAccessTokenActions.setSavedPersonalAccessToken({...savedPersonalAccessToken, success: false}));
                dispatch(personalAccessTokenActions.resetSavedPersonalAccessToken(null))
            }
            // confirm({
            //     icon: <ExclamationCircleOutlined/>,
            //     width: 600,
            //     content: <Space direction="vertical" size="small">
            //         {savedPersonalAccessToken &&
            //             <>
            //                 <Title level={5}>Token created successfully</Title>
            //                 <Paragraph>You will only see this token once so copy it before closing this window.</Paragraph>
            //                 <Text>Token: {savedPersonalAccessToken.data.plain_token}</Text>
            //             </>
            //         }
            //     </Space>,
            //     okType: 'danger',
            //     onOk() {
            //
            //     },
            //     onCancel() {
            //
            //     },
            // });
        } else if (savedPersonalAccessToken.error) {
            message.error({
                content: 'Failed to create personal access token. You might not have enough permissions.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(personalAccessTokenActions.setSavedPersonalAccessToken({...savedPersonalAccessToken, error: null}));
            dispatch(personalAccessTokenActions.resetSavedPersonalAccessToken(null))
        }
    }, [savedPersonalAccessToken])

    const transformTokenTable = (d: PersonalAccessToken[], u: User[]): TokenDataTable[] => {
        return d.map(p => ({
            key: p.id,
            user_name: u.find(u => u.id === p.created_by) ? u.find(u => u.id === p.created_by)?.name : "Unknown",
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
            (_f.description.toLowerCase().includes(t) || _f.status.toLowerCase().includes(t) || _f.user_name.toLowerCase().includes(t) || t === "")
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
        confirm({
            icon: <ExclamationCircleOutlined/>,
            width: 600,
            content: <Space direction="vertical" size="small">
                {personalAccessTokenToDelete &&
                    <>
                        <Title level={5}>Delete token "{personalAccessTokenToDelete ? personalAccessTokenToDelete.description : ''}"</Title>
                        <Paragraph>Are you sure you want to delete token?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(personalAccessTokenActions.deletePersonalAccessToken.request({
                    getAccessTokenSilently: getAccessTokenSilently,
                    payload: {
                        user_id: oidcUser.sub,
                        id: personalAccessTokenToDelete ? personalAccessTokenToDelete.id : null,
                        description: personalAccessTokenToDelete ? personalAccessTokenToDelete.description : null,
                    } as SpecificPAT
                }));
            },
            onCancel() {
                setPersonalAccessTokenToDelete(null);
            },
        });
    }

    const onClickAddNewPersonalAccessToken = () => {
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenVisible(true));
        dispatch(personalAccessTokenActions.setPersonalAccessToken({
            user_id: "",
            description: "",
            expires_in: 7
        } as PersonalAccessTokenCreate))
    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Personal Access Tokens</Title>
                        <Paragraph>A list of all the personal access tokens for your user.</Paragraph>
                        <Space direction="vertical" size="large" style={{display: 'flex'}}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    {/*<Input.Search allowClear value={textToSearch} onPressEnter={searchDataTable} onSearch={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />*/}
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
                                    <Column title="Description" dataIndex="description"
                                            onFilter={(value: string | number | boolean, record) => (record as any).description.includes(value)}
                                            sorter={(a, b) => ((a as any).description.localeCompare((b as any).description))}
                                            render={(text, record, index) => {
                                                return <Text strong>{text}</Text>
                                            }}
                                    />

                                    <Column title="Created By" dataIndex="user_name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).user_name.includes(value)}
                                            sorter={(a, b) => ((a as any).user_name.localeCompare((b as any).user_name))}
                                    />

                                    <Column title="Last Used" dataIndex="last_used_formatted"
                                            sorter={(a, b) => ((a as any).last_used_formatted.localeCompare((b as any).last_used_formatted))}
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
            <PersonalAccessTokenNew/>
        </>
    )
}

export default SettingsPersonal;