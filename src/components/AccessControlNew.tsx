import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import { actions as ruleActions } from '../store/rule';
import { actions as groupsActions } from '../store/group';
import {
    Col,
    Row,
    Typography,
    Input,
    Space,
    Radio,
    Button, Drawer, Form, List, Divider, Select, Tag
} from "antd";
import {FlagFilled, QuestionCircleFilled} from "@ant-design/icons";
import type { CustomTagProps } from 'rc-select/lib/BaseSelect'
import {Rule, RuleToSave} from "../store/rule/types";
import {useAuth0} from "@auth0/auth0-react";
import { uniq } from "lodash"

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

    const [tagGroups, setTagGroups] = useState([] as string[])
    const [formRule, setFormRule] = useState({} as FormRule)
    const [form] = Form.useForm()

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
            Source,
            Destination,
            sourcesNoId,
            destinationsNoId,
            groupsToSave,
            Flow: formRule.Flow
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
        dispatch(ruleActions.setRule({
            Name: '',
            Source: [],
            Destination: [],
            Flow: 'bidirect'
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
                <strong>{label}</strong>
            </Tag>
        );
    };

    // const testDeleteGroup = () => {
    //     groups.forEach(g => {
    //         dispatch(groupsActions.deleteGroup.request({getAccessTokenSilently, payload: g.ID || ''}))
    //     })
    // }

    return (
        <>
            {rule &&
                <Drawer
                    title={`${formRule.ID ? 'Edit Rule' : 'New Rule'}`}
                    forceRender={true}
                    // width={512}
                    visible={setupNewRuleVisible}
                    bodyStyle={{paddingBottom: 80}}
                    onClose={onCancel}
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
                                <Form.Item
                                    name="Name"
                                    label="Name"
                                    rules={[{required: true, message: 'Please enter key name'}]}
                                >
                                    <Input placeholder="Please enter key name" autoComplete="off"/>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="tagSourceGroups"
                                    label="Source"
                                    rules={[{required: true, message: 'Please enter ate least one group'}]}
                                    style={{display: 'flex'}}
                                >
                                    <Select mode="tags"  style={{ width: '100%' }} placeholder="Tags Mode" tagRender={tagRender} onChange={handleChangeSource}>
                                        {
                                            tagGroups.map(m =>
                                                <Option key={m}>{m}</Option>
                                            )
                                        }
                                    </Select>
                                </Form.Item>
                            </Col>
                            <Col span={24}>
                                <Form.Item
                                    name="tagDestinationGroups"
                                    label="Destination"
                                    rules={[{required: true, message: 'Please enter ate least one group'}]}
                                    style={{display: 'flex'}}
                                >
                                    <Select mode="tags" style={{ width: '100%' }} placeholder="Tags Mode" tagRender={tagRender}  onChange={handleChangeDestination}>
                                        {
                                            tagGroups.map(m =>
                                                <Option key={m}>{m}</Option>
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
                                        <a href="https://docs.netbird.io/overview/access-control" target="_blank">
                                            <Paragraph>
                                                At the moment access rules are bi-directional by default, this means both source and destination can talk to each-other in both directions. However destination peers will not be able to communicate with each other, nor will the source peers.
                                            </Paragraph>
                                            <Paragraph>
                                                If you want to enable all peers of the same group to talk to each other - you can add that group both as a receiver and as a destination.
                                            </Paragraph>
                                        </a>
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