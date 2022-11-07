import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as nsGroupActions} from '../store/nameservers';
import {
    Button,
    Col,
    Divider,
    Drawer,
    Form,
    FormListFieldData,
    Input,
    InputNumber,
    Radio,
    Row,
    Select,
    Space,
    Typography
} from "antd";
import {CloseOutlined, FlagFilled, MinusCircleOutlined, PlusOutlined, QuestionCircleFilled} from "@ant-design/icons";
import {Header} from "antd/es/layout/layout";
import {RuleObject} from "antd/lib/form";
import cidrRegex from 'cidr-regex';
import {NameServer, NameServerGroup, NameServerGroupToSave} from "../store/nameservers/types";
import {useGetGroupTagHelpers} from "../utils/groups"
import {useGetAccessTokenSilently} from "../utils/token";

const {Paragraph} = Typography;

interface formNSGroup extends NameServerGroup {
}

const NameServerGroupUpdate = () => {
    const {
        tagRender,
        handleChangeTags,
        dropDownRender,
        optionRender,
        tagGroups,
        getExistingAndToCreateGroupsLists,
        getGroupNamesFromIDs
    } = useGetGroupTagHelpers()
    const dispatch = useDispatch()
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const {Option} = Select;
    const nsGroup = useSelector((state: RootState) => state.nameserverGroup.nameserverGroup)
    const setupNewNameServerGroupVisible = useSelector((state: RootState) => state.nameserverGroup.setupNewNameServerGroupVisible)
    const savedNSGroup = useSelector((state: RootState) => state.nameserverGroup.savedNameServerGroup)

    const [formNSGroup, setFormNSGroup] = useState({} as formNSGroup)
    const [form] = Form.useForm()
    const [editName, setEditName] = useState(false)
    const [editDescription, setEditDescription] = useState(false)
    const inputNameRef = useRef<any>(null)
    const inputDescriptionRef = useRef<any>(null)
    const [selectCustom, setSelectCustom] = useState(false)

    const optionsDisabledEnabled = [{label: 'Enabled', value: true}, {label: 'Disabled', value: false}]
    const optionsPrimary = [{label: 'Yes', value: true}, {label: 'No', value: false}]

    useEffect(() => {
        if (!nsGroup) return

        let newFormGroup = {
            ...nsGroup,
            groups: getGroupNamesFromIDs(nsGroup.groups),
        } as formNSGroup
        setFormNSGroup(newFormGroup)
        form.setFieldsValue(newFormGroup)
        if (nsGroup.id) {
            setSelectCustom(true)
        }
    }, [nsGroup])

    const onCancel = () => {
        dispatch(nsGroupActions.setSetupNewNameServerGroupVisible(false));
        dispatch(nsGroupActions.setNameServerGroup(
            {
                id: '',
                name: '',
                description: '',
                primary: false,
                domains: [],
                nameservers: [] as NameServer[],
                groups: [],
                enabled: false,
            } as NameServerGroup
        ))
        setEditName(false)
        setSelectCustom(false)
    }
    let googleChoice = 'Google DNS'
    let cloudflareChoice = 'Cloudflare DNS'
    let quad9Choice = 'Quad9 DNS'
    let customChoice = 'Add custom nameserver'

    let defaultDNSOptions: NameServerGroup[] = [
        {
            name: googleChoice,
            description: 'Google DNS servers',
            domains: [],
            primary: true,
            nameservers: [
                {
                    ip: "8.8.8.8",
                    ns_type: "udp",
                    port: 53,
                },
                {
                    ip: "8.8.4.4",
                    ns_type: "udp",
                    port: 53,
                },
            ],
            groups: [],
            enabled: true,
        },
        {
            name: cloudflareChoice,
            description: 'Cloudflare DNS servers',
            domains: [],
            primary: true,
            nameservers: [
                {
                    ip: "1.1.1.1",
                    ns_type: "udp",
                    port: 53,
                },
                {
                    ip: "1.0.0.1",
                    ns_type: "udp",
                    port: 53,
                },
            ],
            groups: [],
            enabled: true,
        },
        {
            name: quad9Choice,
            description: 'Quad9 DNS servers',
            domains: [],
            primary: true,
            nameservers: [
                {
                    ip: "9.9.9.9",
                    ns_type: "udp",
                    port: 53,
                },
                {
                    ip: "149.112.112.112",
                    ns_type: "udp",
                    port: 53,
                },
            ],
            groups: [],
            enabled: true,
        },
    ]



    const handleSelectChange = (value: string) => {
        console.log(`selected ${value}`);
        let nsGroupLocal = {} as NameServerGroup
        if (value === customChoice) {
            nsGroupLocal = nsGroup
        } else {
            defaultDNSOptions.forEach((nsg) => {
                if (value === nsg.name) {
                    nsGroupLocal = nsg
                }
            })
        }
        let newFormGroup = {
            ...nsGroupLocal,
            groups: getGroupNamesFromIDs(nsGroupLocal.groups),
        } as formNSGroup
        setFormNSGroup(newFormGroup)
        form.setFieldsValue(newFormGroup)
        setSelectCustom(true)
    };


    const onChange = (data: formNSGroup) => {
        if (!data.nameservers) {
            setFormNSGroup({...formNSGroup, ...data})
            return
        }

        let newNSList: NameServer[]
        newNSList = formNSGroup.nameservers ? formNSGroup.nameservers : data.nameservers
        data.nameservers.forEach((value: NameServer, index: number) => {
            if (value) {
                if (!newNSList[index]) {
                    newNSList[index] = value
                } else {
                    if (typeof (value.ns_type) != 'undefined') {
                        newNSList[index].ns_type = value.ns_type
                    }
                    if (typeof (value.ip) != 'undefined') {
                        newNSList[index].ip = value.ip
                    }
                    if (typeof (value.port) != 'undefined') {
                        newNSList[index].port = value.port
                    }
                }
            }
        })

        setFormNSGroup({...formNSGroup, nameservers: newNSList})
    }

    const handleFormSubmit = () => {
        console.log("validating")
        form.validateFields()
            .then(() => {
                const nsGroupToSave = createNSGroupToSave()
                console.log(nsGroupToSave)
                dispatch(nsGroupActions.saveNameServerGroup.request({
                    getAccessTokenSilently: getAccessTokenSilently,
                    payload: nsGroupToSave
                }))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    }

    const createNSGroupToSave = (): NameServerGroupToSave => {
        console.log(formNSGroup)
        let [existingGroups, newGroups] = getExistingAndToCreateGroupsLists(formNSGroup.groups)
        return {
            id: formNSGroup.id || null,
            name: formNSGroup.name,
            description: formNSGroup.description,
            primary: formNSGroup.primary,
            domains: formNSGroup.domains,
            nameservers: formNSGroup.nameservers,
            groups: existingGroups,
            groupsToCreate: newGroups,
            enabled: formNSGroup.enabled,
        } as NameServerGroupToSave
    }

    const toggleEditName = (b: boolean) => {
        setEditDescription(b)
    }

    const toggleEditDescription = (b: boolean) => {
        setEditDescription(b)
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

    const ipValidator = (_: RuleObject, value: string) => {
        if (!cidrRegex().test(value + "/32")) {
            return Promise.reject(new Error("Please enter a valid IP, e.g. 192.168.1.1 or 8.8.8.8"))
        }

        return Promise.resolve()
    }

    // @ts-ignore
    const formListValidator = (_: RuleObject, names) => {
        if (names.length >= 3) {
            return Promise.reject(new Error("Exceeded maximum number of Nameservers. (Max is 2)"));
        }
        if (names.length < 1) {
            return Promise.reject(new Error("You should add at least 1 Nameserver"));
        }
        return Promise.resolve()
    }

    // @ts-ignore
    const renderNSList = (fields: FormListFieldData[], {add, remove}, {errors}) => (
        <>
            <Row>Nameservers</Row>
            {!!fields.length && (

                <Row align='middle'>
                    <Col span={6} style={{textAlign: 'center'}}>
                        <Typography.Text>Protocol</Typography.Text>
                    </Col>
                    <Col span={10} style={{textAlign: 'center'}}>
                        <Typography.Text>Nameserver IP</Typography.Text>
                    </Col>
                    <Col span={4} style={{textAlign: 'center'}}>
                        <Typography.Text>Port</Typography.Text>
                    </Col>
                    <Col span={2}/>
                </Row>
            )}
            {fields.map((field, index) => {
                return (
                    <Row key={index}>
                        <Col span={6} style={{textAlign: 'center'}}>
                            <Form.Item style={{margin: '3px'}}
                                       name={[field.name, 'ns_type']}
                                       rules={[{required: true, message: 'Missing first protocol'}]}
                                       initialValue={"udp"}
                            >
                                <Select defaultValue="udp" style={{width: '100%'}}>
                                    <Option value="udp">UDP</Option>
                                </Select>
                            </Form.Item>
                        </Col>
                        <Col span={10} style={{margin: '1px'}}>
                            <Form.Item style={{margin: '1px'}}
                                       name={[field.name, 'ip']}
                                       rules={[{validator: ipValidator}]}
                            >
                                <Input placeholder="e.g. X.X.X.X" style={{width: '100%'}}
                                       autoComplete="off"/>
                            </Form.Item>
                        </Col>
                        <Col span={4} style={{textAlign: 'center'}}>
                            <Form.Item style={{margin: '1px'}}
                                       name={[field.name, 'port']}
                                       rules={[{required: true, message: 'Missing port'}]}
                                       initialValue={53}
                            >
                                <InputNumber defaultValue={53} placeholder="Port" style={{width: '100%'}}/>
                            </Form.Item>
                        </Col>
                        <Col span={2} style={{textAlign: 'center'}}>
                            <MinusCircleOutlined onClick={() => remove(field.name)}/>
                        </Col>
                    </Row>
                )
            })}

            <Form.Item>
                <Button type="dashed" onClick={() => add()} block icon={<PlusOutlined/>}>
                    Add Nameserver
                </Button>
            </Form.Item>
            <Form.ErrorList errors={errors}/>
        </>
    )

    return (
        <>
            {nsGroup &&
                <Drawer
                    headerStyle={{display: "none"}}
                    forceRender={true}
                    open={setupNewNameServerGroupVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    autoFocus={true}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button onClick={onCancel} disabled={savedNSGroup.loading}>Cancel</Button>
                            <Button type="primary" disabled={savedNSGroup.loading}
                                    onClick={handleFormSubmit}>{`${formNSGroup.id ? 'Save' : 'Create'}`}</Button>
                        </Space>
                    }
                >
                    {selectCustom ?
                        (<Form layout="vertical" requiredMark={false} form={form} onValuesChange={onChange}>
                            <Row gutter={16}>
                                <Col span={24}>
                                    <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                        <Row align="top">
                                            <Col flex="none" style={{display: "flex"}}>
                                                {!editName && !editDescription && formNSGroup.id &&
                                                    <button type="button" aria-label="Close"
                                                            className="ant-drawer-close"
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
                                                {!editName && formNSGroup.id ? (
                                                    <div className={"access-control input-text ant-drawer-title"}
                                                         onClick={() => toggleEditName(true)}>{formNSGroup.id ? formNSGroup.name : 'New nameserver group'}</div>
                                                ) : (
                                                    <Form.Item
                                                        name="name"
                                                        label="Name"
                                                        tooltip="Add a nameserver group name"
                                                        rules={[{
                                                            required: true,
                                                            message: 'Please add an identifier for this nameserver group',
                                                            whitespace: true
                                                        }]}
                                                    >
                                                        <Input placeholder="e.g. Public DNS" ref={inputNameRef}
                                                               onPressEnter={() => toggleEditName(false)}
                                                               onBlur={() => toggleEditName(false)} autoComplete="off"
                                                               maxLength={40}/>
                                                    </Form.Item>
                                                )}
                                                {!editDescription ? (
                                                    <div className={"access-control input-text ant-drawer-subtitle"}
                                                         onClick={() => toggleEditDescription(true)}>{formNSGroup.description && formNSGroup.description.trim() !== "" ? formNSGroup.description : 'Add description...'}</div>
                                                ) : (
                                                    <Form.Item
                                                        name="description"
                                                        label="Description"
                                                        style={{marginTop: 24}}
                                                    >
                                                        <Input placeholder="Add description..."
                                                               ref={inputDescriptionRef}
                                                               onPressEnter={() => toggleEditDescription(false)}
                                                               onBlur={() => toggleEditDescription(false)}
                                                               autoComplete="off" maxLength={200}/>
                                                    </Form.Item>
                                                )}

                                            </Col>
                                        </Row>
                                        <Row align="top">
                                            <Col flex="auto">

                                            </Col>
                                        </Row>

                                    </Header>
                                </Col>
                                <Col span={24}>

                                </Col>

                                <Col span={24}>
                                    <Form.Item
                                        name="enabled"
                                        label="Status"
                                    >
                                        <Radio.Group
                                            options={optionsDisabledEnabled}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                    </Form.Item>
                                </Col>

                                <Col span={24}>
                                    <Form.Item
                                        name="primary"
                                        label="Primary"
                                    >
                                        <Radio.Group
                                            options={optionsPrimary}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                    </Form.Item>
                                </Col>

                                <Col span={24} flex="auto">
                                    <Form.List
                                        name="nameservers"
                                        rules={[{validator: formListValidator}]}
                                    >
                                        {renderNSList}
                                    </Form.List>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        name="groups"
                                        label="Distribution groups"
                                        tooltip="Every peer enrolled with this user will be automatically added to these groups"
                                        rules={[{validator: selectValidator}]}
                                    >
                                        <Select mode="tags"
                                                style={{width: '100%'}}
                                                placeholder="Associate groups with the NS group"
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
                                    <Row wrap={false} gutter={12}>
                                        <Col flex="none">
                                            <FlagFilled/>
                                        </Col>
                                        <Col flex="auto">
                                            <Paragraph>
                                                You can enable high-availability by assigning the same network
                                                identifier
                                                and network CIDR to multiple routes.
                                            </Paragraph>
                                        </Col>
                                    </Row>
                                </Col>
                                <Col span={24}>
                                    <Divider></Divider>
                                    <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                            href="https://netbird.io/docs/how-to-guides/network-routes"
                                            style={{color: 'rgb(07, 114, 128)'}}>Learn
                                        more about network routes</Button>
                                </Col>
                            </Row>
                        </Form>) :
                        (
                            <Space direction={"vertical"} style={{ width: '100%' }}>
                            <Row align='middle'>
                                <Col span={24} style={{textAlign: 'left'}}>
                                    <span className="ant-form-item">Select a predefined nameserver</span>
                                </Col>
                            </Row>
                            <Row align='middle'>
                            <Col span={24} style={{textAlign: 'center'}}>
                                <Select
                                    style={{width: '100%'}}
                                    onChange={handleSelectChange}
                                    options={[
                                        {
                                            value: googleChoice,
                                            label: googleChoice,
                                        },
                                        {
                                            value: cloudflareChoice,
                                            label: cloudflareChoice,
                                        },
                                        {
                                            value: quad9Choice,
                                            label: quad9Choice,
                                        },
                                        {
                                            value: customChoice,
                                            label: customChoice,
                                        },
                                    ]}
                                />
                            </Col>
                            </Row>
                                <Row align='middle'>
                                    <Col span={24} style={{textAlign: 'left'}}>
                                        <Col span={24} style={{textAlign: 'left'}}>
                                            <span className="ant-form-item"><Typography.Link onClick={() => handleSelectChange(customChoice)}>Or add custom</Typography.Link></span>
                                        </Col>
                                    </Col>
                                </Row>
                            </Space>
                        )
                    }

                </Drawer>
            }
        </>
    )
}

export default NameServerGroupUpdate