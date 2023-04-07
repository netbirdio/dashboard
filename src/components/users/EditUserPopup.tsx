import {Button, Col, Divider, Form, Input, InputNumber, Modal, Row, Select, Space, Tag, Typography} from "antd";
import {Container} from "../Container";
import {CheckOutlined, CopyOutlined, QuestionCircleFilled} from "@ant-design/icons";
import SyntaxHighlighter from "react-syntax-highlighter";
import React, {useEffect, useRef, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as personalAccessTokenActions} from "../../store/personal-access-token";
import {PersonalAccessTokenCreate} from "../../store/personal-access-token/types";
import {useGetTokenSilently} from "../../utils/token";
import {actions as userActions} from "../../store/user";
import {FormUser, User, UserToSave} from "../../store/user/types";
import {RuleObject} from "antd/lib/form";
import {CustomTagProps} from "rc-select/lib/BaseSelect";
import {actions as groupActions} from "../../store/group";

const {Title, Text, Paragraph} = Typography;
const {Option} = Select;

const EditUserPopup = () => {
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const groups = useSelector((state: RootState) => state.group.data)
    const users = useSelector((state: RootState) => state.user.data)

    const user = useSelector((state: RootState) => state.user.user)
    const failed = useSelector((state: RootState) => state.user.failed);
    const loading = useSelector((state: RootState) => state.user.loading);
    const editUserModalOpen = useSelector((state: RootState) => state.user.editUserPopupVisible)
    const savedUser = useSelector((state: RootState) => state.user.savedUser)
    const [tagGroups, setTagGroups] = useState([] as string[])
    const [currentGroups, setCurrentGroups] = useState([] as string[])

    const [confirmModal, confirmModalContextHolder] = Modal.useModal();
    const [editUsername, setEditUsername] = useState(false)

    const [formUser, setFormUser] = useState({} as FormUser)
    const [form] = Form.useForm()
    const inputNameRef = useRef<any>(null)

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
        dispatch(groupActions.getGroups.request({
            getAccessTokenSilently: getTokenSilently,
            payload: null
        }))
    }, [])

    useEffect(() => {
        if (user && currentGroups) {
            form.setFieldsValue({
                name: user.name,
                role: user.role,
                autoGroupsNames: currentGroups,
            })
        }
    }, [form, user, currentGroups])

    const onCancel = () => {
        if (savedUser.loading) return
        dispatch(userActions.setUser({
            id: "",
            email: "",
            role: "",
            status: "",
            auto_groups: [],
            name: "",
            is_current: false,
        } as User));
        setFormUser({} as FormUser)
        dispatch(userActions.setEditUserPopupVisible(false));
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

    return (
        <>
            {user && <Modal
                open={editUserModalOpen}
                onCancel={onCancel}
                footer={
                    <Space style={{display: 'flex', justifyContent: 'end'}}>
                        <Button disabled={loading} onClick={onCancel}>Cancel</Button>
                        <Button type="primary"
                                onClick={handleFormSubmit}>Save</Button>
                    </Space>
                }
                width={780}
            >
                <Container style={{textAlign: "left"}}>
                    <Form layout="vertical" hideRequiredMark form={form}
                          initialValues={{
                              name: formUser.name,
                              role: formUser.role,
                              autoGroupsNames: formUser.autoGroupsNames,
                          }}
                          style={{paddingLeft: "10px", paddingRight: "10px"}}
                    >
                        {!editUsername && <Paragraph
                            style={{textAlign: "left", whiteSpace: "pre-line", fontSize: "2em"}}>
                            {user.name}
                        </Paragraph>}
                        {editUsername && <Form.Item
                            name="name">
                            <Input
                                placeholder={""}
                                ref={inputNameRef}
                                autoComplete="off"/>
                        </Form.Item>

                        }
                        <Paragraph type={"secondary"}
                                   style={{
                                       textAlign: "left",
                                       whiteSpace: "pre-line",
                                       marginTop: "-25px",
                                       paddingBottom: "25px",
                                   }}>
                            {user.email ? user.email : "this.would.be.empty@serviceuser.com"}
                        </Paragraph>
                        <Col span={24}>
                            <Form.Item
                                name="role"
                                label="Role"
                            >
                                <Select style={{width: '100%'}}>
                                    <Option value="admin">admin</Option>
                                    <Option value="user">user</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={24}>
                            <Form.Item
                                name="autoGroupsNames"
                                label="Auto-assigned groups"
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
                    </Form>
                </Container>
            </Modal>}
            {confirmModalContextHolder}
        </>
    )

}

export default EditUserPopup