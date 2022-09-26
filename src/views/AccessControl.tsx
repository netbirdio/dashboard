import React, {useEffect, useState} from 'react';
import {
    Alert,
    Button,
    Card,
    Col,
    Dropdown,
    Input,
    Menu,
    message,
    Modal,
    Popover,
    Radio,
    RadioChangeEvent,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Tooltip,
    Typography
} from "antd";
import {Container} from "../components/Container";
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {Rule} from "../store/rule/types";
import {actions as ruleActions} from "../store/rule";
import {actions as groupActions} from "../store/group";
import {filter, sortBy} from "lodash";
import {CloseOutlined, ExclamationCircleOutlined} from "@ant-design/icons";
import bidirect from '../assets/direct_bi.svg';
import inbound from '../assets/direct_in.svg';
import outbound from '../assets/direct_out.svg';
import AccessControlNew from "../components/AccessControlNew";
import {Group} from "../store/group/types";
import AccessControlModalGroups from "../components/AccessControlModalGroups";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";

const {Title, Paragraph} = Typography;
const {Column} = Table;
const {confirm} = Modal;

interface RuleDataTable extends Rule {
    key: string;
    sourceCount: number;
    sourceLabel: '';
    destinationCount: number;
    destinationLabel: '';
}

interface GroupsToShow {
    title: string,
    groups: Group[] | string[] | null,
    modalVisible: boolean
}

export const AccessControl = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const rules = useSelector((state: RootState) => state.rule.data);
    const failed = useSelector((state: RootState) => state.rule.failed);
    const loading = useSelector((state: RootState) => state.rule.loading);
    const deletedRule = useSelector((state: RootState) => state.rule.deletedRule);
    const savedRule = useSelector((state: RootState) => state.rule.savedRule);

    const [showTutorial, setShowTutorial] = useState(true)
    const [textToSearch, setTextToSearch] = useState('');
    const [optionAllEnable, setOptionAllEnable] = useState('enabled');
    const [pageSize, setPageSize] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataTable, setDataTable] = useState([] as RuleDataTable[]);
    const [ruleToAction, setRuleToAction] = useState(null as RuleDataTable | null);
    const [groupsToShow, setGroupsToShow] = useState({} as GroupsToShow)
    const setupNewRuleVisible = useSelector((state: RootState) => state.rule.setupNewRuleVisible);
    const [groupPopupVisible, setGroupPopupVisible] = useState(false as boolean | undefined)

    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const optionsAllEnabled = [{label: 'Enabled', value: 'enabled'}, {label: 'All', value: 'all'}]

    const itemsMenuAction = [
        {
            key: "view",
            label: (<Button type="text" block onClick={() => onClickViewRule()}>View</Button>)
        },
        // {
        //     key: "delete",
        //     label: (<Button type="text" block onClick={() => showConfirmDeactivate()}>Deactivate</Button>)
        // },
        {
            key: "delete",
            label: (<Button type="text" block onClick={() => showConfirmDelete()}>Delete</Button>)
        }
    ]
    const actionsMenu = (<Menu items={itemsMenuAction}></Menu>)

    const getSourceDestinationLabel = (data: Group[]): string => {
        return (!data) ? "No group" : (data.length > 1) ? `${data.length} Groups` : (data.length === 1) ? data[0].name : "No group"
    }

    const isShowTutorial = (rules: Rule[]): boolean => {
        return (!rules.length || (rules.length === 1 && rules[0].name === "Default"))
    }

    const transformDataTable = (d: Rule[]): RuleDataTable[] => {
        return d.map(p => {
            const sourceLabel = getSourceDestinationLabel(p.sources as Group[])
            const destinationLabel = getSourceDestinationLabel(p.destinations as Group[])
            return {
                key: p.id, ...p,
                sourceCount: p.sources?.length,
                sourceLabel,
                destinationCount: p.destinations?.length,
                destinationLabel
            } as RuleDataTable
        })
    }

    useEffect(() => {
        dispatch(ruleActions.getRules.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
        dispatch(groupActions.getGroups.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setShowTutorial(isShowTutorial(rules))
        setDataTable(sortBy(transformDataTable(filterDataTable()), "name"))
    }, [rules])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionAllEnable])

    const styleNotification = {marginTop: 85}

    const saveKey = 'saving';
    useEffect(() => {
        if (savedRule.loading) {
            message.loading({content: 'Saving...', key: saveKey, duration: 0, style: styleNotification})
        } else if (savedRule.success) {
            message.success({
                content: 'Rule has been successfully saved.',
                key: saveKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(ruleActions.setSetupNewRuleVisible(false))
            dispatch(ruleActions.setSavedRule({...savedRule, success: false}))
            dispatch(ruleActions.resetSavedRule(null))
        } else if (savedRule.error) {
            message.error({
                content: 'Failed to update rule. You might not have enough permissions.',
                key: saveKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(ruleActions.setSavedRule({...savedRule, error: null}))
            dispatch(ruleActions.resetSavedRule(null))
        }
    }, [savedRule])

    const deleteKey = 'deleting';
    useEffect(() => {
        const style = {marginTop: 85}
        if (deletedRule.loading) {
            message.loading({content: 'Deleting...', key: deleteKey, style})
        } else if (deletedRule.success) {
            message.success({content: 'Rule has been successfully disabled.', key: deleteKey, duration: 2, style})
            dispatch(ruleActions.resetDeletedRule(null))
        } else if (deletedRule.error) {
            message.error({
                content: 'Failed to remove rule. You might not have enough permissions.',
                key: deleteKey,
                duration: 2,
                style
            })
            dispatch(ruleActions.resetDeletedRule(null))
        }
    }, [deletedRule])

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangeAllEnabled = ({target: {value}}: RadioChangeEvent) => {
        setOptionAllEnable(value)
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const showConfirmDelete = () => {
        confirm({
            icon: <ExclamationCircleOutlined/>,
            width: 600,
            content: <Space direction="vertical" size="small">
                {ruleToAction &&
                    <>
                        <Title level={5}>Delete rule "{ruleToAction ? ruleToAction.name : ''}"</Title>
                        <Paragraph>Are you sure you want to delete peer from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(ruleActions.deleteRule.request({
                    getAccessTokenSilently: getAccessTokenSilently,
                    payload: ruleToAction?.id || ''
                }));
            },
            onCancel() {
                setRuleToAction(null);
            },
        });
    }

    const showConfirmDeactivate = () => {
        confirm({
            icon: <ExclamationCircleOutlined/>,
            width: 600,
            content: <Space direction="vertical" size="small">
                {ruleToAction &&
                    <>
                        <Title level={5}>Deactivate rule "{ruleToAction ? ruleToAction.name : ''}"</Title>
                        <Paragraph>Are you sure you want to deactivate peer from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                //dispatch(ruleActions.deleteRule.request({getAccessTokenSilently, payload: ruleToAction?.id || ''}));
            },
            onCancel() {
                setRuleToAction(null);
            },
        });
    }

    const filterDataTable = (): Rule[] => {
        const t = textToSearch.toLowerCase().trim()
        let f: Rule[] = filter(rules, (f: Rule) =>
            (f.name.toLowerCase().includes(t) || f.description.toLowerCase().includes(t) || t === "")
        ) as Rule[]
        if (optionAllEnable !== "all") {
            f = filter(f, (f: Rule) => !f.disabled)
        }
        return f
    }

    const onClickAddNewRule = () => {
        dispatch(ruleActions.setSetupNewRuleVisible(true));
        dispatch(ruleActions.setRule({
            name: '',
            description: '',
            sources: [],
            destinations: [],
            flow: 'bidirect',
            disabled: false
        } as Rule))
    }

    const onClickViewRule = () => {
        dispatch(ruleActions.setSetupNewRuleVisible(true));
        dispatch(ruleActions.setRule({
            id: ruleToAction?.id || null,
            name: ruleToAction?.name,
            description: ruleToAction?.description,
            sources: ruleToAction?.sources,
            destinations: ruleToAction?.destinations,
            flow: ruleToAction?.flow,
            disabled: ruleToAction?.disabled
        } as Rule))
    }

    const setRuleAndView = (rule: RuleDataTable) => {
        dispatch(ruleActions.setSetupNewRuleVisible(true));
        dispatch(ruleActions.setRule({
            id: rule.id || null,
            name: rule.name,
            description: rule.description,
            sources: rule.sources,
            destinations: rule.destinations,
            flow: rule.flow,
            disabled: rule.disabled
        } as Rule))
    }

    const toggleModalGroups = (title: string, groups: Group[] | string[] | null, modalVisible: boolean) => {
        setGroupsToShow({
            title,
            groups,
            modalVisible
        })
    }

    useEffect(() => {
        if (setupNewRuleVisible) {
            setGroupPopupVisible(false)
        }
    }, [setupNewRuleVisible])

    const onPopoverVisibleChange = (b: boolean) => {
        if (setupNewRuleVisible) {
            setGroupPopupVisible(false)
        } else {
            setGroupPopupVisible(undefined)
        }
    }

    const renderPopoverGroups = (label: string, groups: Group[] | string[] | null, rule: RuleDataTable) => {
        const content = groups?.map((g, i) => {
            const _g = g as Group
            const peersCount = ` - ${_g.peers_count || 0} ${(!_g.peers_count || parseInt(_g.peers_count) !== 1) ? 'peers' : 'peer'} `
            return (
                <Space direction="vertical">
                    <div key={i}>
                        <Tag
                            color="blue"
                            style={{marginRight: 3}}
                        >
                            <strong>{_g.name}</strong>
                        </Tag>
                        <span style={{fontSize: ".85em"}}>{peersCount}</span>
                    </div>
                </Space>
            )
        })
        return (
            <Popover
                onVisibleChange={onPopoverVisibleChange}
                visible={groupPopupVisible}
                content={content}
                title={null}>
                <Button type="link" onClick={() => setRuleAndView(rule)}>{label}</Button>
            </Popover>
        )
    }

    return (
        <>
            <Container className="container-main">
                <Row>
                    <Col span={24}>
                        <Title level={4}>Access Control</Title>
                        <Paragraph>Access rules help you manage access permissions in your organisation.</Paragraph>
                        <Space direction="vertical" size="large" style={{display: 'flex'}}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable}
                                           placeholder="Search..." onChange={onChangeTextToSearch}/>
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
                                        <Radio.Group
                                            options={optionsAllEnabled}
                                            onChange={onChangeAllEnabled}
                                            value={optionAllEnable}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
                                        <Select value={pageSize.toString()} options={pageSizeOptions}
                                                onChange={onChangePageSize} className="select-rows-per-page-en"/>
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
                                            <Button type="primary" disabled={savedRule.loading}
                                                    onClick={onClickAddNewRule}>Add Rule</Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.code} description={failed.message} type="error" showIcon
                                       closable/>
                            }
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{
                                        current: currentPage, hideOnSinglePage: showTutorial, disabled: showTutorial,
                                        pageSize, responsive: true, showSizeChanger: false,
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} rules`),
                                        onChange: (page, pageSize) => {
                                            setCurrentPage(page)
                                        }
                                    }}
                                    className={`access-control-table ${showTutorial ? "card-table card-table-no-placeholder" : "card-table"}`}
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}
                                            defaultSortOrder='ascend'
                                            render={(text, record, index) => {
                                                const desc = (record as RuleDataTable).description.trim()
                                                return <Tooltip title={desc !== "" ? desc : "no description"}
                                                                arrowPointAtCenter>
                                                    <span onClick={() => setRuleAndView(record as RuleDataTable)}
                                                          className="tooltip-label"><strong style={{color: "#5a5c5a"}}>{text}</strong></span>
                                                </Tooltip>
                                            }}
                                    />
                                    <Column title="Status" dataIndex="disabled"
                                            render={(text: Boolean, record: RuleDataTable, index) => {
                                                return text ? <Tag color="red">disabled</Tag> :
                                                    <Tag color="green">enabled</Tag>
                                            }}
                                    />
                                    <Column title="Sources" dataIndex="sourceLabel"
                                            render={(text, record: RuleDataTable, index) => {
                                                //return <Button type="link" onClick={() => toggleModalGroups(`${record.Name} - Sources`, record.Source, true)}>{text}</Button>
                                                return renderPopoverGroups(text, record.sources, record as RuleDataTable)
                                            }}
                                    />
                                    <Column title="Direction" dataIndex="flow"
                                            render={(text, record: RuleDataTable, index) => {
                                                const s = {minWidth: 50, textAlign: "center"} as React.CSSProperties
                                                if (text === "bidirect")
                                                    return <Tag color="processing" style={s}><img src={bidirect}/></Tag>
                                                else if (text === "srcToDest") {
                                                    return <Tag color="green" style={s}><img src={outbound}/></Tag>
                                                } else if (text === "destToSrc") {
                                                    return <Tag color="green" style={s}><img src={inbound}/></Tag>
                                                }
                                                return <Tag color="red" style={s}><CloseOutlined/></Tag>
                                            }}
                                    />
                                    <Column title="Destinations" dataIndex="destinationLabel"
                                            render={(text, record: RuleDataTable, index) => {
                                                //return <Button type="link" onClick={() => toggleModalGroups(`${record.name} - Destinations`, record.destinations, true)}>{text}</Button>
                                                return renderPopoverGroups(text, record.destinations, record as RuleDataTable)
                                            }}
                                    />
                                    <Column title="" align="center"
                                            render={(text, record, index) => {
                                                if (deletedRule.loading || savedRule.loading) return <></>
                                                return <Dropdown.Button type="text" overlay={actionsMenu}
                                                                        trigger={["click"]}
                                                                        onVisibleChange={visible => {
                                                                            if (visible) setRuleToAction(record as RuleDataTable)
                                                                        }}></Dropdown.Button>
                                            }}
                                    />
                                </Table>
                                {showTutorial &&
                                    <Space direction="vertical" size="small" align="center"
                                           style={{display: 'flex', padding: '45px 15px'}}>
                                        <Button type="link" onClick={onClickAddNewRule}>Add new access rule</Button>
                                    </Space>
                                }
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Container>
            <AccessControlModalGroups data={groupsToShow.groups} title={groupsToShow.title}
                                      visible={groupsToShow.modalVisible}
                                      onCancel={() => toggleModalGroups("", [], false)}/>
            <AccessControlNew/>
        </>
    )
}

export default AccessControl;