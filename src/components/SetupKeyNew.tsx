import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {actions as setupKeyActions} from '../store/setup-key';
import {
    Button,
    Col,
    DatePicker,
    DatePickerProps,
    Divider,
    Drawer,
    Form,
    Input,
    List,
    Radio,
    Row,
    Select,
    Space,
    Tag,
    Typography
} from "antd";
import {RootState} from "typesafe-actions";
import {CloseOutlined, EditOutlined, QuestionCircleFilled} from "@ant-design/icons";
import {SetupKey, SetupKeyToSave} from "../store/setup-key/types";
import {useOidcAccessToken} from "@axa-fr/react-oidc";
import {Header} from "antd/es/layout/layout";
import {formatDate, timeAgo} from "../utils/common";
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

interface FormSetupKey extends SetupKey {
    autoGroupNames: string[]
}

const SetupKeyNew = () => {
    const {accessToken} = useOidcAccessToken()
    const dispatch = useDispatch()
    const setupNewKeyVisible = useSelector((state: RootState) => state.setupKey.setupNewKeyVisible)
    const setupKey = useSelector((state: RootState) => state.setupKey.setupKey)
    const savedSetupKey = useSelector((state: RootState) => state.setupKey.savedSetupKey)
    const groups = useSelector((state: RootState) => state.group.data)
    const [editName, setEditName] = useState(false)
    const inputNameRef = useRef<any>(null)
    const [selectedTagGroups, setSelectedTagGroups] = useState([] as string[])
    const [tagGroups, setTagGroups] = useState([] as string[])

    const [formSetupKey, setFormSetupKey] = useState({} as FormSetupKey)
    const [form] = Form.useForm()

    useEffect(() => {
        if (editName) inputNameRef.current!.focus({
            cursor: 'end',
        });
    }, [editName]);

    useEffect(() => {
        setTagGroups(groups?.map(g => g.name) || [])
    }, [groups])

    useEffect(() => {
        if (!setupKey) return
        const fSetupKey = {
            ...setupKey,
            autoGroupNames: setupKey.auto_groups ? setupKey.auto_groups?.map(t => t.name) : [],
        } as FormSetupKey
        setFormSetupKey(fSetupKey)
        form.setFieldsValue(fSetupKey)
    }, [setupKey])

    const createSetupKeyToSave = (): SetupKeyToSave => {
        const autoGroups = groups?.filter(g => formSetupKey.autoGroupNames.includes(g.name)).map(g => g.id || '') || []
        // find groups that do not yet exist (newly added by the user)
        const allGroupsNames : string[] = groups?.map(g => g.name);
        const groupsToCreate = formSetupKey.autoGroupNames.filter(s => !allGroupsNames.includes(s))
        return {
            id: formSetupKey.id,
            name: formSetupKey.name,
            type: formSetupKey.type,
            auto_groups: autoGroups,
            revoked: formSetupKey.revoked,
            groupsToCreate: groupsToCreate
        } as SetupKeyToSave
    }
    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                let setupKeyToSave = createSetupKeyToSave()
                dispatch(setupKeyActions.saveSetupKey.request({
                    getAccessTokenSilently: accessToken,
                    payload: setupKeyToSave
                }))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const setVisibleNewSetupKey = (status: boolean) => {
        dispatch(setupKeyActions.setSetupNewKeyVisible(status));
    }

    const onCancel = () => {
        if (savedSetupKey.loading) return
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
        setVisibleNewSetupKey(false)
    }

    const onChange = (data: any) => {
        setFormSetupKey({...formSetupKey, ...data})
    }

    const toggleEditName = (status: boolean) => {
        setEditName(status);
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

    const inputLabel = (text: any) => (
        <>
            <span>{text}</span>
            <Tag color="red">{formSetupKey.state}</Tag>
        </>
    )

    return (
        <>
            {setupKey &&
                <Drawer
                    forceRender={true}
                    headerStyle={{display: "none"}}
                    visible={setupNewKeyVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button disabled={savedSetupKey.loading} onClick={onCancel}>Cancel</Button>
                            <Button type="primary" disabled={savedSetupKey.loading}
                                    onClick={handleFormSubmit}>{`${formSetupKey.id ? 'Save' : 'Create'}`}</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                    <Row align="top">
                                        <Col flex="none" style={{display: "flex"}}>
                                            {!editName && setupKey.id &&
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
                                        <Col flex="auto">
                                            {!editName && setupKey.id && formSetupKey.name ? (
                                                <div className={"access-control input-text ant-drawer-title"}
                                                     onClick={() => toggleEditName(true)}>{formSetupKey.name ? formSetupKey.name : setupKey.name}
                                                    <EditOutlined/></div>
                                            ) : (
                                                <Form.Item
                                                    name="name"
                                                    label="Name"
                                                    rules={[{
                                                        required: true,
                                                        message: 'Please add a new name for this peer',
                                                        whitespace: true
                                                    }]}
                                                    style={{display: 'flex'}}
                                                >
                                                    <Input
                                                        placeholder={setupKey.name}
                                                        ref={inputNameRef}
                                                        onPressEnter={() => toggleEditName(false)}
                                                        onBlur={() => toggleEditName(false)}
                                                        autoComplete="off"/>
                                                </Form.Item>)}
                                        </Col>
                                    </Row>
                                </Header>
                            </Col>
                            {setupKey.id && formSetupKey.name &&
                                <Col span={24}>
                                    <Form.Item
                                        name="key"
                                        label={<>
                                            <span style={{
                                                marginRight: "5px",
                                            }}>Key</span>
                                            <Tag
                                                color={formSetupKey.state === "valid" ? "green" : "red"}>{formSetupKey.state}</Tag>
                                        </>}
                                    >
                                        <Input
                                            disabled={true}
                                            autoComplete="off"/>
                                    </Form.Item>
                                </Col>
                            }

                            {setupKey.id && formSetupKey.name &&
                                <Col span={12}>
                                    <Form.Item
                                        name="expires"
                                        label="Expires"
                                        tooltip="The expiration date of the key"
                                    >
                                        <DatePicker disabled={true} style={{width: '100%'}}
                                                    format={customExpiresFormat}/>
                                    </Form.Item>
                                </Col>
                            }
                            {setupKey.id && formSetupKey.name &&
                                <Col span={12}>
                                    <Form.Item
                                        name="last_used"
                                        label="Last Used"
                                        tooltip="The last time the key was used"
                                    >
                                        <DatePicker disabled={true} style={{width: '100%'}}
                                                    format={customLastUsedFormat}/>
                                    </Form.Item>
                                </Col>
                            }
                            <Col span={24}>
                                <Form.Item
                                    name="type"
                                    label="Type"
                                    rules={[{required: true, message: 'Please enter key type'}]}
                                    style={{display: 'flex'}}
                                >
                                    <Radio.Group style={{display: 'flex'}} disabled={setupKey.id}>
                                        <Space direction="vertical" style={{flex: 1}}>
                                            <List
                                                size="large"
                                                bordered
                                            >
                                                <List.Item>
                                                    <Radio value={"reusable"}>
                                                        <Space direction="vertical" size="small">
                                                            <Text strong>Reusable</Text>
                                                            <Text>This type of a setup key allows to enroll multiple
                                                                machines</Text>
                                                        </Space>
                                                    </Radio>
                                                </List.Item>
                                                <List.Item>
                                                    <Radio value={"one-off"}>
                                                        <Space direction="vertical" size="small">
                                                            <Text strong>One-off</Text>
                                                            <Text>This key can be used only once</Text>
                                                        </Space>
                                                    </Radio>
                                                </List.Item>
                                            </List>

                                        </Space>
                                    </Radio.Group>

                                </Form.Item>
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
                                            disabled={!formSetupKey.valid}
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

export default SetupKeyNew