import {
    Button, Card,
    Col,
    Collapse,
    Divider,
    Input,
    message,
    Modal, Radio, RadioChangeEvent,
    Row,
    Space,
    Table,
    Tag,
    Typography
} from "antd";
import {Container} from "../Container";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import React, {useEffect, useRef, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as personalAccessTokenActions} from "../../store/personal-access-token";
import {PersonalAccessToken, PersonalAccessTokenCreate, SpecificPAT} from "../../store/personal-access-token/types";
import {useGetTokenSilently} from "../../utils/token";
import {actions as userActions} from "../../store/user";
import {useOidcUser} from "@axa-fr/react-oidc";
import tableSpin from "../Spin";
import Column from "antd/lib/table/Column";
import {filter, isNil} from "lodash";
import {timeAgo} from "../../utils/common";
import AddPATPopup from "../personalaccesstokens/AddPATPopup";
const {Title, Text, Paragraph} = Typography;

const styleNotification = {marginTop: 85}

interface TokenDataTable extends PersonalAccessToken {
    key: string
    status: String
}

const ViewUserPopup = () => {
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const groups = useSelector((state: RootState) => state.group.data)
    const users = useSelector((state: RootState) => state.user.data)

    const user = useSelector((state: RootState) => state.user.user)
    const personalAccessTokens = useSelector((state: RootState) => state.personalAccessToken.data);
    const deletedPersonalAccessToken = useSelector((state: RootState) => state.personalAccessToken.deletedPersonalAccessToken);
    const loading = useSelector((state: RootState) => state.user.loading);
    const viewUserModalOpen = useSelector((state: RootState) => state.user.viewUserPopupVisible)
    const [confirmModal, confirmModalContextHolder] = Modal.useModal();

    const {oidcUser} = useOidcUser();
    const [isAdmin, setIsAdmin] = useState(false);

    const { Panel } = Collapse;

    const [tokenTable, setTokenTable] = useState([] as TokenDataTable[]);
    const [textToSearch, setTextToSearch] = useState('');

    const [tagGroups, setTagGroups] = useState([] as string[])

    const optionsValidAll = [ {label: 'All', value: 'all'}, {label: 'Valid', value: 'valid'}, {label: 'Expired', value: 'expired'}]
    const [optionValidAll, setOptionValidAll] = useState('all');
    const onChangeValidAll = ({target: {value}}: RadioChangeEvent) => {
        setOptionValidAll(value)
    }

    useEffect(() => {
        if(users && oidcUser) {
            let currentUser = users.find((user) => user.is_current)
            if(currentUser) {
                setIsAdmin(currentUser.role === 'admin');
            }
        }
    }, [users, oidcUser])

    useEffect(() => {
        if(user && user.id) {
            dispatch(personalAccessTokenActions.getPersonalAccessTokens.request({
                getAccessTokenSilently: getTokenSilently,
                payload:  user.id}));
        }
    }, [user])

    useEffect(() => {
        setTokenTable(filterDataTable(transformTokenTable(personalAccessTokens)))
    }, [personalAccessTokens, optionValidAll, textToSearch])

    useEffect(() => {
        if(user) {
            // @ts-ignore
            setTagGroups(groups?.filter(g => g.name != "All" && user.auto_groups.includes(g.id)).map(g => g.name) || [])
        }
    }, [groups, user])

    const optionRender = (label: string) => {
        let peersCount = ''
        const g = groups.find(_g => _g.name === label)
        if (g) peersCount = ` - ${g.peers_count || 0} ${(!g.peers_count || parseInt(g.peers_count) !== 1) ? 'peers' : 'peer'} `
        return (
            <>
                <Tag
                    color="blue"
                    style={{marginRight: 3}}
                >
                    <strong>{label}</strong>
                </Tag>
                <span style={{fontSize: ".85em", marginRight: "30px"}}>{peersCount}</span>
            </>
        )
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

    const transformTokenTable = (d: PersonalAccessToken[]): TokenDataTable[] => {
        if(!d) {
            return []
        }
        return d.map(p => ({
            key: p.id,
            status: Date.parse(p.expiration_date) > Date.now() ? "valid" : "expired",
            ...p} as TokenDataTable))
    }

    const searchDataTable = () => {
        setTokenTable(filterDataTable(transformTokenTable(personalAccessTokens)))
    }

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const onClickAddNewPersonalAccessToken = () => {
        dispatch(personalAccessTokenActions.setPersonalAccessToken({
            user_id: "",
            name: "",
            expires_in: 7
        } as PersonalAccessTokenCreate))
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenPopupVisible(true));
    }

    const onCancel = () => {
        dispatch(userActions.setViewUserPopupVisible(false));
    }

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


    const handleEdit = () => {
        dispatch(userActions.setViewUserPopupVisible(false))
        dispatch(userActions.setEditUserPopupVisible(true));
    };

    const showConfirmDelete = (token: TokenDataTable) => {
        confirmModal.confirm({
            icon: <ExclamationCircleOutlined/>,
            title: "Delete token \"" + token.name + "\"",
            width: 600,
            content: <Space direction="vertical" size="small">
                <Paragraph>Are you sure you want to delete this token?</Paragraph>
            </Space>,
            onOk() {
                dispatch(personalAccessTokenActions.deletePersonalAccessToken.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: {
                        user_id: user.id,
                        id: token.id,
                        name: token.name,
                    } as SpecificPAT
                }));
            },
            onCancel() {
                // noop
            },
        });
    }

    return (
        <>
            {user && <Modal
                open={viewUserModalOpen}
                onCancel={onCancel}
                footer={
                    <Space style={{display: 'flex', justifyContent: 'end'}}>
                        <Button disabled={loading} onClick={onCancel}>Close</Button>
                        <Button disabled={!isAdmin} type="primary"
                                onClick={handleEdit}>Edit</Button>
                    </Space>
                }
                width={780}
            >
                <Container style={{textAlign: "left"}}>
                    <Paragraph
                        style={{textAlign: "left", whiteSpace: "pre-line", fontSize: "2em"}}>
                            {user.name + "      "}
                            <Tag color="blue" style={{fontSize: "20px", paddingBottom: "3px", marginTop: "-50px"}}>{user.role}</Tag>
                    </Paragraph>
                    <Paragraph type={"secondary"}
                               style={{
                                   textAlign: "left",
                                   whiteSpace: "pre-line",
                                   marginTop: "-25px",
                                   paddingBottom: "15px",
                               }}>
                        {user.email ? user.email : "this.would.be.empty@serviceuser.com"}
                    </Paragraph>
                    <Divider orientation="left">Groups</Divider>
                    <Space size={[0, 3]} wrap>
                        {tagGroups.map(group =>
                            optionRender(group)
                        )}
                    </Space>
                    <Collapse style={{marginTop: "30px"}}>
                        <Panel header="Personal Access Tokens" key="1" >
                            <Paragraph type={"secondary"}
                                       style={{
                                           textAlign: "left",
                                           whiteSpace: "pre-line",
                                       }}>
                                {"Personal access tokens are used to authenticate as a user against Netbird's Public API. " +
                                "Each token has an expiration date after which it will become invalid. " +
                                "To create a new token for this user, click the button below. "}
                            </Paragraph>
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
                            <Card bodyStyle={{padding: 0}} style={{marginTop: "10px"}}>
                                <Table
                                    className="card-table"
                                    pagination={{
                                        pageSize: 5,
                                        showSizeChanger: false,
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} personal access tokens`)
                                    }}
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={tokenTable}>
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}
                                            render={(text, record, index) => {
                                                return text
                                            }}
                                    />

                                    <Column title="Last Used" dataIndex="last_used"
                                            sorter={(a, b) => ((a as any).last_used.localeCompare((b as any).last_used))}
                                            render={(text, record, index) => {
                                                return isNil((record as TokenDataTable).last_used) ? "never" : timeAgo(text)
                                            }}
                                    />
                                    <Column title="Created" dataIndex="created_at"
                                            sorter={(a, b) => ((a as any).created_at.localeCompare((b as any).created_at))}
                                            render={(text, record, index) => {
                                                return timeAgo(text)
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

                                    <Column title="" align="center" width="30px"
                                            render={(text, record, index) => {
                                                return (
                                                    <Button danger={true} style={{marginLeft: "3px", marginRight: "3px"}}
                                                            onClick={() => {
                                                                let tokenRecord = (record as TokenDataTable)
                                                                showConfirmDelete(tokenRecord)
                                                            }}
                                                    >Delete</Button>
                                                )
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Panel>
                    </Collapse>
                </Container>
            </Modal>}
            <AddPATPopup/>
            {confirmModalContextHolder}
        </>
    )

}

export default ViewUserPopup