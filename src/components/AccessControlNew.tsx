import React, {useEffect, useRef, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import { actions as ruleActions } from '../store/rule';
import {
    Col,
    Row,
    Typography,
    Input,
    Space,
    Switch,
    Button, Drawer, Form, Divider, Select, Tag
} from "antd";
import {ArrowRightOutlined, CheckOutlined, CloseOutlined, FlagFilled, QuestionCircleFilled} from "@ant-design/icons";
import type { CustomTagProps } from 'rc-select/lib/BaseSelect'
import {Rule, RuleToSave} from "../store/rule/types";
import {useAuth0} from "@auth0/auth0-react";
import { uniq } from "lodash"
import {Header} from "antd/es/layout/layout";

const { Paragraph } = Typography;
const { Option } = Select;

interface FormRule extends Rule {
    tagSourceGroups: string[]
    tagDestinationGroups: string[]
}

const AccessControlNew = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()
    const setupNewRuleVisible = useSelector((state: RootState) => state.rule.setupNewRuleVisible)
    const groups =  useSelector((state: RootState) => state.group.data)
    const rule =  useSelector((state: RootState) => state.rule.rule)
    const savedRule = useSelector((state: RootState) => state.rule.savedRule)

    const [editName, setEditName] = useState(false)
    const [tagGroups, setTagGroups] = useState([] as string[])
    const [formRule, setFormRule] = useState({} as FormRule)
    const [form] = Form.useForm()
    const inputNameRef = useRef<any>(null)

    useEffect(() => {
        if (editName) inputNameRef.current!.focus({
            cursor: 'end',
        });
    }, [editName]);

    useEffect(() => {
        if (!rule) return
        const fRule = {
            ...rule,
            tagSourceGroups: rule.Source ? rule.Source?.map(t => t.Name) : [],
            tagDestinationGroups: rule.Destination ? rule.Destination?.map(t => t.Name) : []
        } as FormRule
        setFormRule(fRule)
        form.setFieldsValue(fRule)
    }, [rule])

    useEffect(() => {
        setTagGroups(groups?.map(g => g.Name) || [])
    }, [groups])

    const createRuleToSave = ():RuleToSave => {
        const Source = groups?.filter(g => formRule.tagSourceGroups.includes(g.Name)).map(g => g.ID || '') || []
        const Destination = groups?.filter(g => formRule.tagDestinationGroups.includes(g.Name)).map(g => g.ID || '') || []
        const sourcesNoId = formRule.tagSourceGroups.filter(s => !tagGroups.includes(s))
        const destinationsNoId = formRule.tagDestinationGroups.filter(s => !tagGroups.includes(s))
        const groupsToSave = uniq([...sourcesNoId, ...destinationsNoId])
        return {
            ID: formRule.ID,
            Name: formRule.Name,
            Description: formRule.Description,
            Source,
            Destination,
            sourcesNoId,
            destinationsNoId,
            groupsToSave,
            Flow: formRule.Flow,
            Disabled: formRule.Disabled
        } as RuleToSave
    }

    const handleFormSubmit = () => {
        form.validateFields()
            .then((values) => {
                const ruleToSave = createRuleToSave()
                dispatch(ruleActions.saveRule.request({getAccessTokenSilently, payload: ruleToSave}))
            })
            .catch((errorInfo) => {
                console.log('errorInfo', errorInfo)
            });
    };

    const setVisibleNewRule = (status:boolean) => {
        dispatch(ruleActions.setSetupNewRuleVisible(status));
    }

    const onCancel = () => {
        if (savedRule.loading) return
        setEditName(false)
        dispatch(ruleActions.setRule({
            Name: '',
            Description: '',
            Source: [],
            Destination: [],
            Flow: 'bidirect',
            Disabled: false
        } as Rule))
        setVisibleNewRule(false)
    }

    const onChange = (data:any) => {
        setFormRule({...formRule, ...data})
    }

    const handleChangeSource = (value: string[]) => {
        setFormRule({
            ...formRule,
            tagSourceGroups: value
        })
    };

    const handleChangeDestination = (value: string[]) => {
        setFormRule({
            ...formRule,
            tagDestinationGroups: value
        })
    };

    const handleChangeDisabled = (checked: boolean) => {
        setFormRule({
            ...formRule,
            Disabled: checked
        })
    };

    const tagRender = (props: CustomTagProps) => {
        const { label, value, closable, onClose } = props;
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
                style={{ marginRight: 3 }}
            >
                <strong>{value}</strong>
            </Tag>
        );
    }

    const optionRender = (label: string) => {
        let peersCount = ''
        const g = groups.find(_g => _g.Name === label)
        if (g)  peersCount = ` - ${g.PeersCount || 0} ${(g.PeersCount && parseInt(g.PeersCount) > 1) ? 'peers' : 'peer'} `
        return (
            <>
                <Tag
                    color="blue"
                    style={{ marginRight: 3 }}
                >
                    <strong>{label}</strong>
                </Tag>
                <span style={{fontSize: ".85em"}}>{peersCount}</span>
            </>
        )
    }

    const toggleEditName = (status:boolean) => {
        setEditName(status);
    }

    // const testDeleteGroup = () => {
    //     groups.forEach(g => {
    //         dispatch(groupsActions.deleteGroup.request({getAccessTokenSilently, payload: g.ID || ''}))
    //     })
    // }

    return (
        <>
            {rule &&
                <Drawer
                    //title={`${formRule.ID ? 'Edit Rule' : 'New Rule'}`}
                    headerStyle={{display: "none"}}
                    forceRender={true}
                    // width={512}
                    visible={setupNewRuleVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
                    autoFocus={true}
                    footer={
                        <Space style={{display: 'flex', justifyContent: 'end'}}>
                            <Button onClick={onCancel} disabled={savedRule.loading}>Cancel</Button>
                            <Button type="primary" disabled={savedRule.loading} onClick={handleFormSubmit}>{`${formRule.ID ? 'Save' : 'Create'}`}</Button>
                        </Space>
                    }
                >
                    <Form layout="vertical" hideRequiredMark form={form} onValuesChange={onChange}>
                        <Row gutter={16}>
                            <Col span={24}>
                                <Header style={{margin: "-32px -24px 20px -24px", padding: "24px 24px 0 24px"}}>
                                    <Row align="top">
                                        <Col flex="none" style={{display: "flex"}}>
                                            {!editName && formRule.ID  &&
                                                <button type="button" aria-label="Close" className="ant-drawer-close"
                                                        style={{paddingTop: 3}}
                                                        onClick={onCancel}>
                                                    <span role="img" aria-label="close" className="anticon anticon-close">
                                                        <CloseOutlined size={16}/>
                                                    </span>
                                                </button>
                                            }
                                        </Col>
                                        <Col flex="auto">
                                            { !editName && formRule.ID ? (
                                                <div className={"access-control ant-drawer-title"} onClick={() => toggleEditName(true)}>{formRule.ID ? formRule.Name : 'New Rule'}</div>
                                            ) : (
                                                <Form.Item
                                                    name="Name"
                                                    label={null}
                                                    rules={[{required: true, message: 'Please add a name for this access rule'}]}
                                                >
                                                    <Input placeholder="Add rule name..." ref={inputNameRef} onPressEnter={() => toggleEditName(false)} onBlur={() => toggleEditName(false)} autoComplete="off"/>
                                                </Form.Item>
                                            )}
                                        </Col>
                                    </Row>

                                </Header>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="Description"
                                    label="Description"
                                >
                                    <Input placeholder="Add rule rule description..." autoComplete="off"/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="Disabled"
                                    label="Disabled"
                                    valuePropName="checked"
                                >
                                    <Switch
                                        checkedChildren={<CheckOutlined />}
                                        unCheckedChildren={<CloseOutlined />}

                                        onChange={handleChangeDisabled}
                                    />
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="tagSourceGroups"
                                    label={<>Source groups&nbsp;<ArrowRightOutlined /></>}
                                    rules={[{required: true, message: 'Please enter ate least one group'}]}
                                    style={{display: 'flex'}}
                                >
                                    <Select mode="tags"  style={{ width: '100%' }} placeholder="Tags Mode" tagRender={tagRender} onChange={handleChangeSource}>
                                        {
                                            tagGroups.map(m =>
                                                <Option key={m}>{optionRender(m)}</Option>
                                            )
                                        }
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="tagDestinationGroups"
                                    label={<><ArrowRightOutlined />&nbsp;Destination groups</>}
                                    rules={[{required: true, message: 'Please enter ate least one group'}]}
                                    style={{display: 'flex'}}
                                >
                                    <Select mode="tags" style={{ width: '100%' }} placeholder="Tags Mode" tagRender={tagRender}  onChange={handleChangeDestination}>
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
                                            At the moment access rules are bi-directional by default, this means both source and destination can talk to each-other in both directions. However destination peers will not be able to communicate with each other, nor will the source peers.
                                        </Paragraph>
                                        <Paragraph>
                                            If you want to enable all peers of the same group to talk to each other - you can add that group both as a receiver and as a destination.
                                        </Paragraph>
                                        <a style={{color: 'rgb(07, 114, 128)'}} href="https://docs.netbird.io/overview/access-control" target="_blank">Learn more about access control...</a>
                                    </Col>
                                </Row>
                            </Col>
                            <Col span={24}>
                                <Divider></Divider>
                                <Button icon={<QuestionCircleFilled/>} type="link" target="_blank"
                                        href="https://docs.netbird.io/docs/overview/acls" style={{color: 'rgb(07, 114, 128)'}}>Learn
                                    more about setup keys</Button>
                            </Col>
                        </Row>
                    </Form>

                </Drawer>
            }
        </>
    )
}

export default AccessControlNew