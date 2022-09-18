import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {Button, Col, DatePickerProps, Divider, Drawer, Form, Input, Row, Select, Space, Tag, Typography} from "antd";
import {RootState} from "typesafe-actions";
import {CloseOutlined, EditOutlined, QuestionCircleFilled} from "@ant-design/icons";
import {useOidcAccessToken} from "@axa-fr/react-oidc";
import {Header} from "antd/es/layout/layout";
import {formatDate, timeAgo} from "../utils/common";
import {Group} from "../store/group/types";
import {FormUser, User} from "../store/user/types";
import {RuleObject} from "antd/lib/form";
import {CustomTagProps} from "rc-select/lib/BaseSelect";

const {Option} = Select;

const {Text} = Typography;

const customExpiresFormat: DatePickerProps['format'] = value => {
    return formatDate(value)
}

const customLastUsedFormat: DatePickerProps['format'] = value => {
    if (value.toString().startsWith("0001")) {
        return "never"
    }
    let ago = timeAgo(value.toString())
    if (!ago) {
        return "unused"
    }
    return ago
}

const UserUpdate = () => {
    const {accessToken} = useOidcAccessToken()
    const dispatch = useDispatch()
    const user = useSelector((state: RootState) => state.user.user)
    const savedUser = useSelector((state: RootState) => state.user.savedUser)
    const groups = useSelector((state: RootState) => state.group.data)
    const updateUserDrawerVisible = useSelector((state: RootState) => state.user.updateUserDrawerVisible)
    const [selectedTagGroups, setSelectedTagGroups] = useState([] as string[])
    const [tagGroups, setTagGroups] = useState([] as string[])

    const [formUser, setFormUser] = useState({} as User)
    const [form] = Form.useForm()

    useEffect(() => {
        setTagGroups(groups?.map(g => g.name) || [])
    }, [groups])

    useEffect(() => {
        if (!user) return

        let allGroups = new Map<string, Group>();
        groups.forEach(g => {
            allGroups.set(g.id!, g)
        })

        let formKeyGroups = user.auto_groups.filter(g => allGroups.get(g)).map(g => allGroups.get(g)!.name)

        const fUser = {
            ...user,
            auto_groups_names: user.auto_groups ? formKeyGroups : [],
        } as FormUser
        setFormUser(fUser)
        form.setFieldsValue(fUser)
    }, [user])

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

    const handleChangeTags = (value: string[]) => {
        let validatedValues: string[] = []
        value.forEach(function (v) {
            if (v.trim().length) {
                validatedValues.push(v)
            }
        })
        setSelectedTagGroups(validatedValues)
    };

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                /*let setupKeyToSave = createSetupKeyToSave()
                dispatch(setupKeyActions.saveSetupKey.request({
                    getAccessTokenSilently: accessToken,
                    payload: setupKeyToSave
                }))*/
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const onCancel = () => {
        /*if (savedSetupKey.loading) return
        dispatch(setupKeyActions.setSetupKey({
            name: "",
            type: "reusable",
            key: "",
            last_used: "",
            expires: "",
            state: "valid",
            auto_groups: new Array()
        } as SetupKey))
        setFormSetupKey({} as FormSetupKey)
        setVisibleNewSetupKey(false)*/
    }

    const onChange = (data: any) => {
        setFormUser({...formUser, ...data})
    }

    return (
        <>
            {user &&
                <Drawer
                    forceRender={true}
                    headerStyle={{display: "none"}}
                    visible={updateUserDrawerVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button disabled={savedUser.loading} onClick={onCancel}>Cancel</Button>
                            <Button type="primary" disabled={savedUser.loading}
                                    onClick={handleFormSubmit}>Save</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                    <Row align="top">
                                        {/*Close Icon*/}
                                        <Col flex="none" style={{display: "flex"}}>
                                            {user.id &&
                                                <button type="button" aria-label="Close" className="ant-drawer-close"
                                                        style={{paddingTop: 3}}
                                                        onClick={onCancel}>
                                                    <span role="img" aria-label="close"
                                                          className="anticon anticon-close">
                                                        <CloseOutlined size={16}/>
                                                    </span>
                                                </button>
                                            }
                                        </Col>
                                       {/* Name Label*/}
                                        <Col flex="auto">
                                                <div className={"access-control input-text ant-drawer-title"}>
                                                    {formUser.name}</div>
                                        </Col>
                                    </Row>
                                </Header>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="autoGroupNames"
                                    label="Auto-assigned groups"
                                    tooltip="Every peer enrolled with this key will be automatically added to these groups"
                                    rules={[{validator: selectValidator}]}
                                >
                                    <Select mode="tags"
                                            style={{width: '100%'}}
                                            placeholder="Associate groups with the key"
                                            tagRender={tagRender}
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
                                <Divider></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                        href="https://docs.netbird.io/docs/overview/setup-keys"
                                        style={{color: 'rgb(07, 114, 128)'}}>Learn
                                    more about setup keys</Button>
                            </Col>
                        </Row>
                    </Form>

                </Drawer>
            }
        </>
    )
}

export default UserUpdate