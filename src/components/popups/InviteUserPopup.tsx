import {
    Button,
    Col,
    Divider,
    Form,
    Input,
    Modal,
    Row,
    Select,
    Space,
    Tag,
    Typography
} from "antd";
import {Container} from "../Container";
import React, {useEffect, useRef, useState} from "react";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {useGetTokenSilently} from "../../utils/token";
import {actions as userActions} from "../../store/user";
import {actions as groupActions} from "../../store/group";
import {User, UserToSave} from "../../store/user/types";
import {RuleObject} from "antd/lib/form";
import {CustomTagProps} from "rc-select/lib/BaseSelect";
import {QuestionCircleFilled} from "@ant-design/icons";
import {useGetGroupTagHelpers} from "../../utils/groups";

const {Title, Text, Paragraph} = Typography;
const {Option} = Select;

const InviteUserPopup = () => {
    const {
        optionRender,
        blueTagRender
    } = useGetGroupTagHelpers()
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const groups = useSelector((state: RootState) => state.group.data)
    const users = useSelector((state: RootState) => state.user.data)

    const user = useSelector((state: RootState) => state.user.user)
    const failed = useSelector((state: RootState) => state.user.failed);
    const loading = useSelector((state: RootState) => state.user.loading);
    const inviteUserModalOpen = useSelector((state: RootState) => state.user.inviteUserPopupVisible)
    const savedUser = useSelector((state: RootState) => state.user.savedUser)

    const [confirmModal, confirmModalContextHolder] = Modal.useModal();


    const [form] = Form.useForm()
    const inputNameRef = useRef<any>(null)

    const [tagGroups, setTagGroups] = useState([] as string[])
    const [selectedTagGroups, setSelectedTagGroups] = useState([] as string[])

    const createUserToSave = (values: any): UserToSave => {
        const autoGroups = groups?.filter(g => values.autoGroupsNames && values.autoGroupsNames.includes(g.name)).map(g => g.id || '') || []
        // find groups that do not yet exist (newly added by the user)
        const allGroupsNames: string[] = groups?.map(g => g.name);
        const groupsToCreate = values.autoGroupsNames?.filter((s: string) => !allGroupsNames.includes(s)) || []
        return {
            id: values.id,
            role: values.role,
            email: values.email,
            name: values.name,
            groupsToCreate: groupsToCreate,
            auto_groups: autoGroups,
            is_service_user: false
        } as UserToSave
    }

    const onCancel = () => {
        if (savedUser.loading) return
        dispatch(userActions.setUser(null as unknown as User));
        form.resetFields();
        dispatch(userActions.setInviteUserPopupVisible(false));
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let userToSave = createUserToSave(values)
                dispatch(userActions.saveUser.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: userToSave
                }))
                form.resetFields();
                dispatch(userActions.getRegularUsers.request({getAccessTokenSilently: getTokenSilently, payload: null}));
                dispatch(userActions.setInviteUserPopupVisible(false));
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const selectValidator = (_: RuleObject, value: string[]) => {
        let hasSpaceNamed = []

        if (!value) {
            return Promise.resolve()
        }

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

    const handleChangeTags = (value: string[]) => {
        let validatedValues: string[] = []
        value.forEach(function (v) {
            if (v.trim().length) {
                validatedValues.push(v)
            }
        })
        setSelectedTagGroups(validatedValues)
    };

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

    useEffect(() => {
        setTagGroups(groups?.filter(g => g.name != "All").map(g => g.name) || [])
    }, [groups])

    useEffect(() => {
        dispatch(groupActions.getGroups.request({
            getAccessTokenSilently: getTokenSilently,
            payload: null
        }))
    }, [])

    return (
        <>
            <Modal
                open={inviteUserModalOpen}
                onCancel={onCancel}
                footer={
                    <Space style={{display: 'flex', justifyContent: 'end'}}>
                        <Button disabled={loading} onClick={onCancel}>Cancel</Button>
                        <Button type="primary"
                                onClick={handleFormSubmit}>Invite</Button>
                    </Space>
                }
                width={460}
            >
                <Container style={{textAlign: "start", marginLeft: "-15px", marginRight: "-15px"}}>
                    <Paragraph
                        style={{textAlign: "start", whiteSpace: "pre-line", fontSize: "22px", fontWeight: "500"}}>
                        {"Invite user"}
                    </Paragraph>
                    <Paragraph type={"secondary"}
                               style={{
                                   textAlign: "start",
                                   whiteSpace: "pre-line",
                                   fontSize: "14px",
                                   marginTop: "-23px",
                                   paddingBottom: "25px",
                               }}>
                        {"Invite a user to your network and set their permissions."}
                    </Paragraph>
                    <Form layout="vertical" hideRequiredMark form={form}
                        initialValues={{
                            ["role"]: "user"
                        }}
                    >
                        <Row gutter={16}>
                            <Col span={24}>
                                <Paragraph style={{fontWeight: "bold", marginTop: "-10px"}}>Name</Paragraph>
                                <Paragraph type={"secondary"} style={{marginTop: "-15px"}}>Set a name to easily identify the user</Paragraph>
                                <Form.Item
                                    name="name"
                                    rules={[{
                                        required: true,
                                        message: 'Please add a name for this user',
                                        whitespace: true
                                    }]}
                                    style={{marginTop: "-8px"}}
                                >
                                    <Input
                                        placeholder={'for example "Max Schmidt"'}
                                        ref={inputNameRef}
                                        autoComplete="off"/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Paragraph style={{ fontWeight: "bold", marginTop: "0px"}}>Email</Paragraph>
                                <Paragraph type={"secondary"} style={{marginTop: "-15px"}}>Provide the email address of the user</Paragraph>
                                <Form.Item
                                    name="email"
                                    rules={[{
                                        required: true,
                                        message: 'Please add a valid email address for this user',
                                        whitespace: false,
                                        pattern: new RegExp(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)
                                    }]}
                                    style={{marginTop: "-8px"}}
                                >
                                    <Input
                                        placeholder={'for example "max.schmidt@gmail.com"'}
                                        ref={inputNameRef}
                                        autoComplete="off"/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Paragraph style={{ fontWeight: "bold", marginTop: "0px"}}>Role</Paragraph>
                                <Paragraph type={"secondary"} style={{marginTop: "-15px"}}>Set a role for the user to assign access permissions</Paragraph>
                                <Form.Item
                                    name="role"
                                    rules={[{
                                        required: true,
                                        message: 'Please select a role for this user',
                                        whitespace: true
                                    }]}
                                    style={{marginTop: "-8px"}}
                                >
                                    <Select style={{width: "120px"}}>
                                        <Option value="admin">admin</Option>
                                        <Option value="user">user</Option>
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Paragraph style={{fontWeight: "bold", marginTop: "0px"}}>Auto-assigned groups</Paragraph>
                                <Paragraph type={"secondary"} style={{marginTop: "-15px"}}>Add groups, that will be assigned to peers added by this user</Paragraph>
                                <Form.Item
                                    name="autoGroupsNames"
                                    tooltip="Every peer enrolled with this user will be automatically added to these groups"
                                    rules={[{validator: selectValidator}]}
                                    style={{marginTop: "-8px"}}
                                >
                                    <Select mode="tags"
                                            style={{width: '100%'}}
                                            placeholder="Associate groups with the user"
                                            tagRender={blueTagRender}
                                            onChange={handleChangeTags}
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
                            <Col span={24}>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank" disabled={true} style={{marginTop: "20px", marginBottom: "20px"}}
                                        href="https://docs.netbird.io/how-to/access-netbird-public-api">Learn more about user</Button>
                            </Col>
                        </Row>
                    </Form>
                </Container>
            </Modal>
            {confirmModalContextHolder}
        </>
    )

}

export default InviteUserPopup