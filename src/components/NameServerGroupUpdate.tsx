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
    message,
    Radio,
    Row,
    Select,
    Space,
    Tooltip,
    Typography
} from "antd";
import {
    CloseOutlined,
    FlagFilled,
    MinusCircleOutlined,
    PlusOutlined,
    QuestionCircleFilled,
    QuestionCircleOutlined
} from "@ant-design/icons";
import {Header} from "antd/es/layout/layout";
import {RuleObject} from "antd/lib/form";
import cidrRegex from 'cidr-regex';
import {NameServer, NameServerGroup, NameServerGroupToSave} from "../store/nameservers/types";
import {useGetGroupTagHelpers} from "../utils/groups"
import {useGetTokenSilently} from "../utils/token";

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
        getGroupNamesFromIDs,
        selectValidator
    } = useGetGroupTagHelpers()
    const dispatch = useDispatch()
    const {getTokenSilently} = useGetTokenSilently()
    const {Option} = Select;
    const nsGroup = useSelector((state: RootState) => state.nameserverGroup.nameserverGroup)
    const setupNewNameServerGroupVisible = useSelector((state: RootState) => state.nameserverGroup.setupNewNameServerGroupVisible)
    const savedNSGroup = useSelector((state: RootState) => state.nameserverGroup.savedNameServerGroup)
    const nsGroupData = useSelector((state: RootState) => state.nameserverGroup.data);

    const [formNSGroup, setFormNSGroup] = useState({} as formNSGroup)
    const [form] = Form.useForm()
    const [editName, setEditName] = useState(false)
    const [isPrimary, setIsPrimary] = useState(false)
    const [editDescription, setEditDescription] = useState(false)
    const inputNameRef = useRef<any>(null)
    const inputDescriptionRef = useRef<any>(null)
    const [selectCustom, setSelectCustom] = useState(false)

    const optionsDisabledEnabled = [{label: 'Enabled', value: true}, {label: 'Disabled', value: false}]
    const optionsPrimary = [{label: 'Yes', value: true}, {label: 'No', value: false}]

    useEffect(() => {
        if (editName) inputNameRef.current!.focus({
            cursor: 'end',
        });
    }, [editName]);

    useEffect(() => {
        if (editDescription) inputDescriptionRef.current!.focus({
            cursor: 'end',
        });
    }, [editDescription]);

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
        if (nsGroup.primary !== undefined) {
            setIsPrimary(nsGroup.primary)
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
        setIsPrimary(false)
    }

    const onChange = (changedValues: any) => {
        if (changedValues.primary !== undefined) {
            setIsPrimary(changedValues.primary)
        }
        setFormNSGroup({...formNSGroup, ...changedValues})
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

    const handleFormSubmit = () => {

        form.validateFields()
            .then((values) => {
                const nsGroupToSave = createNSGroupToSave(values as NameServerGroup)
                dispatch(nsGroupActions.saveNameServerGroup.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: nsGroupToSave
                }))

            })
            .then(() => onCancel())
            .catch((errorInfo) => {
                let msg = "please check the fields and try again"
                if (errorInfo.errorFields) {
                    msg = errorInfo.errorFields[0].errors[0]
                }
                message.error({
                    content: msg,
                    duration: 1,
                });
            });
    }

    const createNSGroupToSave = (values: NameServerGroup): NameServerGroupToSave => {
        let [existingGroups, newGroups] = getExistingAndToCreateGroupsLists(values.groups)
        return {
            id: formNSGroup.id || null,
            name: values.name ? values.name : formNSGroup.name,
            description: values.description ? values.description : formNSGroup.description,
            primary: values.primary,
            domains: values.primary ? [] : values.domains,
            nameservers: values.nameservers,
            groups: existingGroups,
            groupsToCreate: newGroups,
            enabled: values.enabled,
        } as NameServerGroupToSave
    }

    const toggleEditName = (status: boolean) => {
        setEditName(status)
    }

    const toggleEditDescription = (status: boolean) => {
        setEditDescription(status)
    }

    const domainRegex = /(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]/;

    const domainValidator = (_: RuleObject, domain: string) => {
        if (domainRegex.test(domain)) {
            return Promise.resolve()
        }
        setIsPrimary(false)
        return Promise.reject(new Error("Please enter a valid domain, e.g. example.com or intra.example.com"))
    }

    const nameValidator = (_: RuleObject, value: string) => {
        const found = nsGroupData.find(u => u.name == value && u.id !== formNSGroup.id)
        if (found) {
            return Promise.reject(new Error("Please enter a unique name for your nameserver configuration"))
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

    const primaryValidator = (_: RuleObject, primary: boolean) => {
        if (!primary && form.getFieldValue("domains").length === 0) {
            return Promise.reject(new Error("You should select between Resolve all domains or add one Match domain"));
        }

        if (primary && form.getFieldValue("domains").length > 0) {
            return Promise.reject(new Error("You should remove all match domains before setting this to yes"));
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
                                <Select disabled style={{width: '100%'}}>
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
                                <InputNumber placeholder="Port" style={{width: '100%'}}/>
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
                    Add nameserver
                </Button>
            </Form.Item>
            <Form.ErrorList errors={errors}/>
        </>
    )

    // @ts-ignore
    const renderDomains = (fields: FormListFieldData[], {add, remove}, {errors}) => (
        <>
            <Row>
                <Space>
                    <Col>
                        Match domains
                    </Col>
                    <Col>
                        <Tooltip title="Only queries to domains specified here will be resolved by these nameservers."
                                 className={"ant-form-item-tooltip"}>
                            <QuestionCircleOutlined style={{color: "rgba(0, 0, 0, 0.45)", cursor: "help"}}/>
                        </Tooltip>
                    </Col>
                </Space>
            </Row>
            {fields.map((field, index) => {
                return (
                    <Row key={index}>
                        <Col span={20} style={{margin: '1px'}}>
                            <Form.Item hidden={isPrimary} style={{margin: '1px'}}
                                       {...field}
                                       rules={[{validator: domainValidator}]}
                            >
                                <Input placeholder="e.g. example.com" style={{width: '100%'}}
                                       autoComplete="off"/>
                            </Form.Item>
                        </Col>
                        <Col span={2} style={{textAlign: 'center'}}>
                            <MinusCircleOutlined hidden={isPrimary} className="dynamic-delete-button"
                                                 onClick={() => remove(field.name)}/>
                        </Col>
                    </Row>
                )
            })}

            <Form.Item>
                <Button type="dashed" disabled={isPrimary} onClick={() => add()} block icon={<PlusOutlined/>}>
                    Add domain
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
                            <Button type="primary" onClick={handleFormSubmit} disabled={savedNSGroup.loading}
                            >{`${formNSGroup.id ? 'Save' : 'Create'}`}</Button>
                        </Space>
                    }
                >
                    {selectCustom ?
                        (<Form layout="vertical" requiredMark={false} form={form}
                               onValuesChange={onChange}
                        >
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
                                                        rules={[
                                                            {
                                                                required: true,
                                                                message: 'Please add an identifier for this nameserver group',
                                                                whitespace: true
                                                            },
                                                            {
                                                                validator: nameValidator
                                                            }
                                                        ]}
                                                    >
                                                        <Input placeholder="e.g. Public DNS" ref={inputNameRef}
                                                               onPressEnter={() => toggleEditName(false)}
                                                               onBlur={() => toggleEditName(false)} autoComplete="off"
                                                               maxLength={40}/>
                                                    </Form.Item>
                                                )}
                                                {!editDescription ? (
                                                    <div className={"access-control input-text ant-drawer-subtitle"}
                                                         onClick={() => toggleEditDescription(true)}>
                                                        {formNSGroup.description && formNSGroup.description.trim() !== "" ? formNSGroup.description : 'Add description...'}
                                                    </div>
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
                                                               autoComplete="off"/>
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
                                        name="primary"
                                        label="Resolve all domains"
                                        rules={[{validator: primaryValidator}]}
                                        dependencies={['domains']} // trigger primaryValidation if domains is updated
                                        tooltip="Defines if the nameservers are resolvers for all domains"
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
                                        name="domains"
                                    >
                                        {renderDomains}
                                    </Form.List>
                                </Col>
                                <Col span={24}>
                                    <Form.Item
                                        name="groups"
                                        label="Distribution groups"
                                        tooltip="Distribution groups define to which group of peers these settings will be distributed to"
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
                                                Nameservers let you define resolvers for your DNS queries.
                                                Because not all operating systems support match-only domain resolution,
                                                you should define at least one set of nameservers to resolve all domains
                                                per distribution group.
                                            </Paragraph>
                                        </Col>
                                    </Row>
                                </Col>
                                <Col span={24}>
                                    <Divider></Divider>
                                    <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                            href="https://netbird.io/docs/how-to/manage-dns-in-your-network">Learn more about nameservers</Button>
                                </Col>
                            </Row>
                        </Form>) :
                        (
                            <Space direction={"vertical"} style={{width: '100%'}}>
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
                                            <span className="ant-form-item"><Typography.Link
                                                onClick={() => handleSelectChange(customChoice)}>Or add custom</Typography.Link></span>
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