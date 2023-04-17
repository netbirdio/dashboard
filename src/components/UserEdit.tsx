import {
    Badge,
    Breadcrumb,
    Button,
    Col,
    Divider,
    Form,
    Input,
    List, Modal,
    Row,
    Select,
    Skeleton,
    Space,
    Tag, Typography
} from "antd";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as userActions} from "../store/user";
import {FormUser, User, UserToSave} from "../store/user/types";
import {useGetTokenSilently} from "../utils/token";
import React, {useEffect, useState} from "react";
import {RuleObject} from "antd/lib/form";
import {CustomTagProps} from "rc-select/lib/BaseSelect";
import {actions as groupActions} from "../store/group";
import {actions as personalAccessTokenActions} from "../store/personal-access-token";
import {PersonalAccessToken, PersonalAccessTokenCreate, SpecificPAT} from "../store/personal-access-token/types";
import tableSpin from "./Spin";
import AddPATPopup from "./AddPATPopup";
import {fullDate} from "../utils/common";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import {Container} from "./Container";

const {Option} = Select;
const {Title, Paragraph, Text} = Typography;

interface TokenDataTable extends PersonalAccessToken {
    key: string
    status: String
    created_by_email: string
}

const UserEdit = () => {
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const groups = useSelector((state: RootState) => state.group.data)
    const users = useSelector((state: RootState) => state.user.data)
    const user = useSelector((state: RootState) => state.user.user)
    const savedUser = useSelector((state: RootState) => state.user.savedUser)
    const personalAccessTokens = useSelector((state: RootState) => state.personalAccessToken.data);

    const loading = useSelector((state: RootState) => state.user.loading);

    const [tokenTable, setTokenTable] = useState([] as TokenDataTable[]);

    const [tagGroups, setTagGroups] = useState([] as string[])
    const [currentGroups, setCurrentGroups] = useState([] as string[])

    const [formUser, setFormUser] = useState({} as FormUser)
    const [form] = Form.useForm()

    const [confirmModal, confirmModalContextHolder] = Modal.useModal();

    const onCancel = () => {
        if (savedUser.loading) return
        dispatch(userActions.setUser(null as unknown as User));
        dispatch(personalAccessTokenActions.resetPersonalAccessTokens(null))
        setFormUser({} as FormUser)
        dispatch(userActions.setEditUserPopupVisible(false));
    }

    const createUserToSave = (values: any): UserToSave => {
        const autoGroups = groups?.filter(g => values.autoGroupsNames.includes(g.name)).map(g => g.id || '') || []
        // find groups that do not yet exist (newly added by the user)
        const allGroupsNames: string[] = groups?.map(g => g.name);
        const groupsToCreate = values.autoGroupsNames.filter((s: string) => !allGroupsNames.includes(s))
        let userID = user ? user.id : ''
        let isServiceUser = user ? user.is_service_user : false
        return {
            id: userID,
            role: values.role,
            name: values.name,
            groupsToCreate: groupsToCreate,
            auto_groups: autoGroups,
            is_service_user: isServiceUser
        } as UserToSave
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let userToSave = createUserToSave(values)
                dispatch(userActions.saveUser.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: userToSave
                }))
                dispatch(userActions.setEditUserPopupVisible(false));
                dispatch(userActions.setUser(null as unknown as User))
                dispatch(personalAccessTokenActions.resetPersonalAccessTokens(null))
                dispatch(groupActions.getGroups.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: null
                }));
                dispatch(userActions.getServiceUsers.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: null
                }))
                dispatch(userActions.getUsers.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: null
                }))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const onClickAddNewPersonalAccessToken = () => {
        dispatch(personalAccessTokenActions.setPersonalAccessToken({
            user_id: "",
            name: "",
            expires_in: 7
        } as PersonalAccessTokenCreate))
        dispatch(personalAccessTokenActions.setNewPersonalAccessTokenPopupVisible(true));
    }

    const onBreadcrumbUsersClick = () => {
        if (savedUser.loading) return
        dispatch(userActions.setUser(null as unknown as User));
        dispatch(personalAccessTokenActions.resetPersonalAccessTokens(null))
    }

    const selectValidator = (_: RuleObject, value: string[]) => {
        let hasSpaceNamed = []

        value.forEach(function (v: string) {
            if (!v.trim().length) {
                hasSpaceNamed.push(v)
            }
        })

        if (hasSpaceNamed.length) {
            return Promise.reject(new Error("Group names with just spaces are not allowed"))
        }

        return Promise.resolve()
    }

    const tagRender = (props: CustomTagProps) => {
        const {label, value, closable, onClose} = props;
        const onPreventMouseDown = (event: React.MouseEvent<HTMLSpanElement>) => {
            event.preventDefault();
            event.stopPropagation();
        };

        return (
            <Tag
                color="blue"
                onMouseDown={onPreventMouseDown}
                closable={closable}
                onClose={onClose}
                style={{marginRight: 3}}
            >
                <strong>{value}</strong>
            </Tag>
        );
    }

    const dropDownRender = (menu: React.ReactElement) => (
        <>
            {menu}
            <Divider style={{margin: '8px 0'}}/>
            <Row style={{padding: '0 8px 4px'}}>
                <Col flex="auto">
                    <span style={{color: "#9CA3AF"}}>Add new group by pressing "Enter"</span>
                </Col>
                <Col flex="none">
                    <svg width="14" height="12" viewBox="0 0 14 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path
                            d="M1.70455 7.19176V5.89915H10.3949C10.7727 5.89915 11.1174 5.80634 11.429 5.62074C11.7405 5.43513 11.9875 5.18655 12.1697 4.875C12.3554 4.56345 12.4482 4.21875 12.4482 3.84091C12.4482 3.46307 12.3554 3.12003 12.1697 2.81179C11.9841 2.50024 11.7356 2.25166 11.424 2.06605C11.1158 1.88044 10.7727 1.78764 10.3949 1.78764H9.83807V0.5H10.3949C11.0114 0.5 11.5715 0.650805 12.0753 0.952414C12.5791 1.25402 12.9818 1.65672 13.2834 2.16051C13.585 2.6643 13.7358 3.22443 13.7358 3.84091C13.7358 4.30161 13.648 4.73414 13.4723 5.13849C13.3 5.54285 13.0613 5.89915 12.7564 6.20739C12.4515 6.51562 12.0968 6.75758 11.6925 6.93324C11.2881 7.10559 10.8556 7.19176 10.3949 7.19176H1.70455ZM4.90128 11.0646L0.382102 6.54545L4.90128 2.02628L5.79119 2.91619L2.15696 6.54545L5.79119 10.1747L4.90128 11.0646Z"
                            fill="#9CA3AF"/>
                    </svg>
                </Col>
            </Row>
        </>
    )

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
                <span style={{fontSize: ".85em"}}>{peersCount}</span>
            </>
        )
    }

    const transformTokenTable = (d: PersonalAccessToken[]): TokenDataTable[] => {
        if(!d) {
            return []
        }
        return d.map(p => ({
            key: p.id,
            status: Date.parse(p.expiration_date) > Date.now() ? "valid" : "expired",
            created_by_email: getEmail(p),
            ...p} as TokenDataTable)).sort((a, b) => -1 * ((a as TokenDataTable).created_at.localeCompare((b as TokenDataTable).created_at)))
    }

    const getEmail = (token: PersonalAccessToken): string => {
        return users.find(u => u.id === token.created_by)?.email || ""
    }

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

    useEffect(() => {
        setTokenTable(transformTokenTable(personalAccessTokens))
    }, [personalAccessTokens, users])

    useEffect(() => {
        setTagGroups(groups?.filter(g => g.name != "All").map(g => g.name) || [])
    }, [groups])

    useEffect(() => {
        if (user) {
            // @ts-ignore
            setCurrentGroups(groups.filter(g => g.name != "All" && user.auto_groups.includes(g.id)).map(g => g.name) || [])
        }
    }, [groups, user])

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently: getTokenSilently, payload: null}))
        dispatch(groupActions.getGroups.request({
            getAccessTokenSilently: getTokenSilently,
            payload: null
        }))
        dispatch(personalAccessTokenActions.getPersonalAccessTokens.request({getAccessTokenSilently: getTokenSilently,
            payload: user.id}))
    }, [])

    useEffect(() => {
        if (user && currentGroups) {
            form.setFieldsValue({
                name: user.name,
                role: user.role,
                email: user.email,
                autoGroupsNames: currentGroups,
            })
        }
    }, [form, user, currentGroups])

    return (
        <>
            <div>
                <Breadcrumb style={{marginBottom: "30px"}}
                            items={[
                                {
                                    title: 'Home',
                                },
                                {
                                    title: <text onClick={onBreadcrumbUsersClick}>Users</text>,
                                },
                                {
                                    title: user.name,
                                },
                            ]}
                />
                <Container style={{backgroundColor: "white", padding: "20px", borderRadius: "4px", boxSizing: "border-box", border: "0.5px solid #D9D9D9", marginBottom: "7px"}}>
                    <div style={{maxWidth: "800px"}}>
                        <Paragraph style={{textAlign: "left", whiteSpace: "pre-line", fontSize: "22px"}}>{user.name}</Paragraph>
                        <Form layout="vertical" hideRequiredMark form={form}
                              initialValues={{
                                  name: formUser.name,
                                  role: formUser.role,
                                  email: formUser.email,
                                  autoGroupsNames: formUser.autoGroupsNames,
                              }}
                        >
                            <Row style={{ paddingBottom: "15px"}}>
                                {!user.is_service_user && <Col span={11}>
                                    <Form.Item
                                        name="email"
                                        label={<text style={{fontSize: "16px", fontWeight: "500"}}>Email</text>}
                                        style={{marginRight: "70px"}}
                                    >
                                        <Input
                                            disabled={user.id}
                                            value={formUser.email}
                                            style={{color: "#5a5c5a"}}
                                            autoComplete="off"/>
                                    </Form.Item>
                                </Col>}
                                <Col span={5}>
                                    <Form.Item
                                        name="role"
                                        label={<text style={{fontSize: "16px", fontWeight: "500"}}>Role</text>}
                                        style={{marginRight: "50px"}}
                                    >
                                        <Select style={{width: '100%'}}
                                                disabled={user.is_current}>
                                            <Option value="admin">admin</Option>
                                            <Option value="user">user</Option>
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                            {!user.is_service_user &&  <Row style={{ paddingBottom: "15px"}}>
                                <Col span={9}>
                                    <Form.Item
                                        name="autoGroupsNames"
                                        label={<text style={{fontSize: "16px", fontWeight: "500"}}>Auto-assigned groups</text>}
                                        tooltip="Every peer enrolled with this user will be automatically added to these groups"
                                        rules={[{validator: selectValidator}]}
                                    >
                                        <Select mode="tags"
                                                style={{width: '100%'}}
                                                placeholder="Associate groups with the user"
                                                tagRender={tagRender}
                                                dropdownRender={dropDownRender}
                                        >
                                            {
                                                tagGroups.map(m =>
                                                    <Option key={m}>{optionRender(m)}</Option>
                                                )
                                            }
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>}
                            <Space style={{display: 'flex', justifyContent: 'start'}}>
                                <Button disabled={loading} onClick={onCancel}>Cancel</Button>
                                <Button type="primary"
                                        onClick={handleFormSubmit}>Save</Button>
                            </Space>
                        </Form>
                    </div>
                </Container>
                {user && (user.is_current || user.is_service_user) && <Container style={{backgroundColor: "white", padding: "20px", borderRadius: "4px", boxSizing: "border-box", border: "0.5px solid #D9D9D9"}}>
                    <div style={{maxWidth: "800px"}}>
                        <Paragraph style={{textAlign: "left", whiteSpace: "pre-line", fontSize: "22px"}}>Access tokens</Paragraph>
                        <Row gutter={21} style={{marginTop: "-22px", marginBottom: "10px"}}>
                            <Col span={20}>
                                <Paragraph type={"secondary"} style={{textAlign: "left", whiteSpace: "pre-line", fontSize: "16px"}}>Access token give access to the Netbird API</Paragraph>
                            </Col>
                            <Col span={1} style={{marginTop: "-8px"}}>
                                <Button type="primary" onClick={onClickAddNewPersonalAccessToken}>Create Token</Button>
                            </Col>
                        </Row>
                        {personalAccessTokens && personalAccessTokens.length > 0 && <List bordered={false}
                              dataSource={tokenTable}
                              loading={tableSpin(loading)}
                              itemLayout="horizontal"
                              renderItem={(item) => (
                                  <List.Item
                                      actions={[<Button danger={true} type={"text"}
                                                        onClick={() => {
                                                            showConfirmDelete(item)
                                                        }}
                                      >Delete</Button>]}
                                      style={{backgroundColor: "white"}}
                                  >
                                      <Skeleton avatar title={false} loading={false} active style={{verticalAlign: "center"}}>
                                          <List.Item.Meta style={{paddingRight: "20px"}}
                                                          avatar={<Badge status={item.status === "valid" ? "success" : "error"} />}
                                                          title={<text style={{fontSize: "16px", fontWeight: "500"}}>{item.name}</text>}
                                                          description={<text style={{fontSize: "13px", fontWeight: "400"}}>{"Created"  + (item.created_by_email ? " by " + item.created_by_email : "") + " on " + fullDate(item.created_at)}</text>}
                                          />
                                          <Col span={4}>
                                              <Paragraph type={"secondary"} style={{textAlign: "left", whiteSpace: "pre-line", fontSize: "11px"}}>Expires on</Paragraph>
                                              <Paragraph type={"secondary"} style={{textAlign: "left", whiteSpace: "pre-line", marginTop: "-10px", marginBottom: "0", fontSize: "15px"}}>{fullDate(item.expiration_date)}</Paragraph>
                                          </Col>
                                          <Col span={4}>
                                              <Paragraph type={"secondary"} style={{textAlign: "left", whiteSpace: "pre-line", fontSize: "11px"}}>Last used</Paragraph>
                                              <Paragraph type={"secondary"} style={{textAlign: "left", whiteSpace: "pre-line", marginTop: "-10px", marginBottom: "0", fontSize: "15px"}}>{item.last_used ? fullDate(item.last_used) : "Never"}</Paragraph>
                                          </Col>
                                      </Skeleton>
                                  </List.Item>
                              )}>
                        </List>}
                        <Divider style={{marginTop: "-15px"}}></Divider>
                        {(personalAccessTokens === null || personalAccessTokens.length === 0) && <Space direction="vertical" size="small" align="center"
                                                                     style={{display: 'flex', padding: '45px 15px', marginTop: "-40px", justifyContent: 'center'}}>
                            <Paragraph
                                style={{textAlign: "center", whiteSpace: "pre-line"}}>
                                You don’t have any access tokens yet.{"\n"}
                                Generate the first one using the button “Create token”
                            </Paragraph>
                        </Space>}
                    </div>
                </Container>}
            </div>
            <AddPATPopup/>
            {confirmModalContextHolder}
        </>
    )

}

export default UserEdit;