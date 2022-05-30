import React, {useEffect, useState} from 'react';
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import {
    Alert,
    Button, Card,
    Col, Dropdown, Input, Menu, message, Modal, Popover, Radio, RadioChangeEvent,
    Row, Select, Space, Table, Tag,
    Typography
} from "antd";
import {Container} from "../components/Container";
import Loading from "../components/Loading";
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
import tutorial from "../assets/access_control_tutorial.svg";
import AccessControlNew from "../components/AccessControlNew";
import {Group} from "../store/group/types";
import {actions as setupKeyActions} from "../store/setup-key";
import AccessControlModalGroups from "../components/AccessControlModalGroups";

const { Title, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

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
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const rules = useSelector((state: RootState) => state.rule.data);
    const failed = useSelector((state: RootState) => state.rule.failed);
    const loading = useSelector((state: RootState) => state.rule.loading);
    const deletedRule = useSelector((state: RootState) => state.rule.deletedRule);
    const savedRule = useSelector((state: RootState) => state.rule.savedRule);

    const [showTutorial, setShowTutorial] = useState(true)
    const [textToSearch, setTextToSearch] = useState('');
    const [optionAllEnable, setOptionAllEnable] = useState('all');
    const [pageSize, setPageSize] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [dataTable, setDataTable] = useState([] as RuleDataTable[]);
    const [ruleToAction, setRuleToAction] = useState(null as RuleDataTable | null);
    const [groupsToShow, setGroupsToShow] = useState({} as GroupsToShow)

    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const optionsAllEnabled = [{label: 'All', value: 'all'}, {label: 'Enabled', value: 'enabled'}]

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
    const actionsMenu = (<Menu items={itemsMenuAction} ></Menu>)

    const getSourceDestinationLabel = (data:Group[]):string => {
        return (!data) ? "No group" : (data.length > 1) ? `${data.length} Groups` : (data.length === 1) ? data[0].Name : "No group"
    }

    const isShowTutorial = (rules:Rule[]):boolean => {
        return (!rules.length || (rules.length === 1 && rules[0].Name === "Default"))
    }

    const transformDataTable = (d:Rule[]):RuleDataTable[] => {
        return d.map(p => {
            const sourceLabel = getSourceDestinationLabel(p.Source as Group[])
            const destinationLabel = getSourceDestinationLabel(p.Destination as Group[])
            return {
                key: p.ID, ...p,
                sourceCount: p.Source?.length,
                sourceLabel,
                destinationCount: p.Destination?.length,
                destinationLabel
            } as RuleDataTable
        })
    }

    useEffect(() => {
        dispatch(ruleActions.getRules.request({getAccessTokenSilently, payload: null}));
        dispatch(groupActions.getGroups.request({getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setShowTutorial(isShowTutorial(rules))
        setDataTable(sortBy(transformDataTable(rules), "Name"))
    }, [rules])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionAllEnable])

    const styleNotification = { marginTop: 85 }

    const saveKey = 'saving';
    useEffect(() => {
        if (savedRule.loading) {
            message.loading({ content: 'Saving...', key: saveKey, duration: 0, style: styleNotification });
        } else if (savedRule.success) {
            message.success({ content: 'Rule saved with success!', key: saveKey, duration: 2, style: styleNotification });
            dispatch(ruleActions.setSetupNewRuleVisible(false));
            dispatch(ruleActions.setSavedRule({ ...savedRule, success: false }));
        } else if (savedRule.error) {
            message.error({ content: 'Error! Something wrong to create key.', key: saveKey, duration: 2, style: styleNotification  });
            dispatch(ruleActions.setSavedRule({ ...savedRule, error: null }));
        }
    }, [savedRule])

    const deleteKey = 'deleting';
    useEffect(() => {
        const style = { marginTop: 85 }
        if (deletedRule.loading) {
            message.loading({ content: 'Deleting...', key: deleteKey, style });
        } else if (deletedRule.success) {
            message.success({ content: 'Rule deleted with success!', key: deleteKey, duration: 2, style });
        } else if (deletedRule.error) {
            message.error({ content: 'Error! Something wrong to delete rule.', key: deleteKey, duration: 2, style  });
        }
    }, [deletedRule])

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangeAllEnabled = ({ target: { value } }: RadioChangeEvent) => {
        setOptionAllEnable(value)
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const showConfirmDelete = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {ruleToAction &&
                    <>
                        <Title level={5}>Delete rule "{ruleToAction ? ruleToAction.Name : ''}"</Title>
                        <Paragraph>Are you sure you want to delete peer from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(ruleActions.deleteRule.request({getAccessTokenSilently, payload: ruleToAction?.ID || ''}));
            },
            onCancel() {
                setRuleToAction(null);
            },
        });
    }

    const showConfirmDeactivate = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {ruleToAction &&
                    <>
                        <Title level={5}>Deactivate rule "{ruleToAction ? ruleToAction.Name : ''}"</Title>
                        <Paragraph>Are you sure you want to deactivate peer from your account?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                //dispatch(ruleActions.deleteRule.request({getAccessTokenSilently, payload: ruleToAction?.ID || ''}));
            },
            onCancel() {
                setRuleToAction(null);
            },
        });
    }

    const filterDataTable = ():Rule[] => {
        const t = textToSearch.toLowerCase().trim()
        let f:Rule[] = filter(rules, (f:Rule) =>
            (f.Name.toLowerCase().includes(t) || t === "")
        ) as Rule[]
        // if (optionAllEnabled === "enabled") {
        //     f = filter(rules, (f:Rule) => f.)
        // }
        return f
    }

    const onClickAddNewRule = () => {
        dispatch(ruleActions.setSetupNewRuleVisible(true));
        dispatch(ruleActions.setRule({
            Name: '',
            Source: [],
            Destination: [],
            Flow: 'bidirect'
        } as Rule))
    }

    const onClickViewRule = () => {
        dispatch(ruleActions.setSetupNewRuleVisible(true));
        dispatch(ruleActions.setRule({
            ID: ruleToAction?.ID || null,
            Name: ruleToAction?.Name,
            Source: ruleToAction?.Source,
            Destination: ruleToAction?.Destination,
            Flow: ruleToAction?.Flow
        } as Rule))
    }

    const toggleModalGroups = (title:string, groups:Group[] | string[] | null, modalVisible:boolean) => {
        setGroupsToShow({
            title,
            groups,
            modalVisible
        })
    }

    const renderPopoverGroups = (label: string, groups:Group[] | string[] | null) => {
        const content = groups?.map(g => {
            const _g = g as Group
            const peersCount = ` - ${_g.PeersCount || 0} ${(_g.PeersCount && parseInt(_g.PeersCount) > 1) ? 'peers' : 'peer'} `
            return (
                <div>
                    <Tag
                        color="blue"
                        style={{ marginRight: 3 }}
                    >
                        <strong>{_g.Name}</strong>
                    </Tag>
                    <span style={{fontSize: ".85em"}}>{peersCount}</span>
                </div>
            )
        })
        return (
            <Popover content={<Space direction="vertical">{content}</Space>} title={null}>
                <Button type="link">{label}</Button>
            </Popover>
        )
    }

    return(
        <>
            <Container className="container-main">
                <Row>
                    <Col span={24}>
                        <Title level={4}>Access Control</Title>
                        <Paragraph>Create and control access groups</Paragraph>
                        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
                                        {/*<Radio.Group
                                            options={optionsAllEnabled}
                                            onChange={onChangeAllEnabled}
                                            value={optionAllEnable}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />*/}
                                        <Select value={pageSize.toString()} options={pageSizeOptions} onChange={onChangePageSize} className="select-rows-per-page-en"/>
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
                                            <Button type="primary" disabled={savedRule.loading} onClick={onClickAddNewRule}>Add Rule</Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.code} description={failed.message} type="error" showIcon closable/>
                            }
                            {loading && <Loading/>}
                            {showTutorial.toString()}
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
                                    className={`${showTutorial ? "card-table card-table-no-placeholder" : "card-table"}`}
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="Name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).Name.includes(value)}
                                            sorter={(a, b) => ((a as any).Name.localeCompare((b as any).Name))} />
                                    <Column title="Sources" dataIndex="sourceLabel"
                                            render={(text, record:RuleDataTable, index) => {
                                                //return <Button type="link" onClick={() => toggleModalGroups(`${record.Name} - Sources`, record.Source, true)}>{text}</Button>
                                                return renderPopoverGroups(text, record.Source)
                                            }}
                                    />
                                    <Column title="Direction" dataIndex="Flow"
                                            render={(text, record:RuleDataTable, index) => {
                                                const s = {minWidth: 50, textAlign: "center"} as React.CSSProperties
                                                if (text === "bidirect")
                                                    return <Tag color="processing" style={s}><img src={bidirect}/></Tag>
                                                else if (text === "srcToDest") {
                                                    return <Tag color="green" style={s}><img src={outbound}/></Tag>
                                                } else if (text === "destToSrc") {
                                                    return <Tag color="green" style={s}><img src={inbound}/></Tag>
                                                }
                                                return <Tag color="red" style={s}><CloseOutlined /></Tag>
                                            }}
                                    />
                                    <Column title="Destinations" dataIndex="destinationLabel"
                                            render={(text, record:RuleDataTable, index) => {
                                                //return <Button type="link" onClick={() => toggleModalGroups(`${record.Name} - Destinations`, record.Destination, true)}>{text}</Button>
                                                return renderPopoverGroups(text, record.Destination)
                                            }}
                                    />
                                    <Column title="" align="center"
                                            render={(text, record, index) => {
                                                if (dataTable.length === 1 || deletedRule.loading || savedRule.loading) return <></>
                                                return <Dropdown.Button type="text" overlay={actionsMenu} trigger={["click"]}
                                                                     onVisibleChange={visible => {
                                                                         if (visible) setRuleToAction(record as RuleDataTable)
                                                                     }}></Dropdown.Button>
                                            }}
                                    />
                                </Table>
                                {showTutorial &&
                                    <Space direction="vertical" size="small" align="center"
                                           style={{display: 'flex', padding: '45px 15px'}}>
                                        <img src={tutorial} style={{width: 362, paddingBottom: 45}}/>
                                        <Title level={5}>Create and control access groups</Title>
                                        <Paragraph>
                                            Access rules help you manage access permissions in your organisation.
                                        </Paragraph>
                                        <Button type="link" onClick={onClickAddNewRule}>Add new access rule</Button>
                                    </Space>
                                }
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Container>
            <AccessControlModalGroups data={groupsToShow.groups} title={groupsToShow.title} visible={groupsToShow.modalVisible} onCancel={() => toggleModalGroups("", [], false)}/>
            <AccessControlNew/>
        </>
    )
}

export default withAuthenticationRequired(AccessControl,
    {
        onRedirecting: () => <Loading/>,
    }
);