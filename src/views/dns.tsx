import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as nsGroupActions} from '../store/nameservers';
import {Container} from "../components/Container";
import {
    Alert,
    Button,
    Card,
    Col,
    Collapse,
    Dropdown,
    Input,
    Menu, message,
    Popover,
    Row,
    Select,
    Space,
    Table, Tabs,
    Tag,
    Typography,
} from "antd";
import {filter} from "lodash";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";
import UserUpdate from "../components/UserUpdate";
import {actions as groupActions} from "../store/group";
import {Group} from "../store/group/types";
import {TooltipPlacement} from "antd/es/tooltip";
import {NameServerGroup} from "../store/nameservers/types";

const {Title, Paragraph, Text} = Typography;
const {Column} = Table;

interface NameserverGroupDataTable extends NameServerGroup {
    key: string
}

const styleNotification = {marginTop: 85}

export const DNS = () => {
    const { Panel } = Collapse;
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const groups = useSelector((state: RootState) => state.group.data)
    const nsGroup = useSelector((state: RootState) => state.nameserverGroup.data);
    const failed = useSelector((state: RootState) => state.nameserverGroup.failed);
    const loading = useSelector((state: RootState) => state.nameserverGroup.loading);
    const updateNameServerGroupVisible = useSelector((state: RootState) => state.nameserverGroup.setupNewNameServerGroupVisible)
    const savedNSGroup = useSelector((state: RootState) => state.nameserverGroup.savedNameServerGroup)

    const [groupPopupVisible, setGroupPopupVisible] = useState(false as boolean | undefined)
    const [nsGroupToAction, setNsGroupToAction] = useState(null as NameserverGroupDataTable | null);
    const [textToSearch, setTextToSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [dataTable, setDataTable] = useState([] as NameserverGroupDataTable[]);
    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    // setUserAndView makes the UserUpdate drawer visible (right side) and sets the user object
    const setUserAndView = (nsGroup: NameServerGroup) => {
        dispatch(nsGroupActions.setSetupNewNameServerGroupVisible(true));
        dispatch(nsGroupActions.setNameServerGroup({
            id: nsGroup.id,
            groups: nsGroup.groups,
            name: nsGroup.name,
            nameservers: nsGroup.nameservers,
        } as NameServerGroup));
    }

    const transformDataTable = (d: NameServerGroup[]): NameserverGroupDataTable[] => {
        return d.map(p => ({key: p.id, ...p} as NameserverGroupDataTable))
    }

    useEffect(() => {
        dispatch(nsGroupActions.getNameServerGroups.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
        dispatch(groupActions.getGroups.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(transformDataTable(nsGroup))
    }, [nsGroup])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch])

    const filterDataTable = (): NameServerGroup[] => {
        const t = textToSearch.toLowerCase().trim()
        let f: NameServerGroup[] = filter(nsGroup, (f: NameServerGroup) =>
            ((f.name ).toLowerCase().includes(t) || f.name.includes(t) || t === "")
        ) as NameServerGroup[]
        return f
    }

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const onClickEdit = () => {
        dispatch(nsGroupActions.setSetupNewNameServerGroupVisible(true));
        dispatch(nsGroupActions.setNameServerGroup({
            id: nsGroupToAction?.id,
            name: nsGroupToAction?.name,
            groups: nsGroupToAction?.groups,
            enabled: nsGroupToAction?.enabled,
            nameservers: nsGroupToAction?.nameservers,
        } as NameServerGroup));
    }

    const renderPopoverGroups = (label: string, rowGroups: string[] | string[] | null, userToAction: NameserverGroupDataTable) => {

        let groupsMap = new Map<string, Group>();
        groups.forEach(g => {
            groupsMap.set(g.id!, g)
        })

        let displayGroups: Group[] = []
        if (rowGroups) {
            displayGroups = rowGroups.filter(g => groupsMap.get(g)).map(g => groupsMap.get(g)!)
        }

        let btn = <Button type="link" onClick={() => setUserAndView(userToAction)}>{displayGroups.length}</Button>
        if (!displayGroups || displayGroups!.length < 1) {
            return btn
        }

        const content = displayGroups?.map((g, i) => {
            const _g = g as Group
            const peersCount = ` - ${_g.peers_count || 0} ${(!_g.peers_count || parseInt(_g.peers_count) !== 1) ? 'peers' : 'peer'} `
            return (
                <div key={i}>
                    <Tag
                        color="blue"
                        style={{marginRight: 3}}
                    >
                        <strong>{_g.name}</strong>
                    </Tag>
                    <span style={{fontSize: ".85em"}}>{peersCount}</span>
                </div>
            )
        })
        const mainContent = (<Space direction="vertical">{content}</Space>)
        let popoverPlacement = "top"
        if (content && content.length > 5) {
            popoverPlacement = "rightTop"
        }

        return (
            <Popover placement={popoverPlacement as TooltipPlacement}
                     key={userToAction.id}
                     onOpenChange={onPopoverVisibleChange}
                     open={groupPopupVisible}
                     content={mainContent}
                     title={null}>
                {btn}
            </Popover>
        )
    }

    useEffect(() => {
        if (updateNameServerGroupVisible) {
            setGroupPopupVisible(false)
        }
    }, [updateNameServerGroupVisible])

    const createKey = 'saving';
    useEffect(() => {
        if (savedNSGroup.loading) {
            message.loading({content: 'Saving...', key: createKey, duration: 0, style: styleNotification});
        } else if (savedNSGroup.success) {
            message.success({
                content: 'User has been successfully saved.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(nsGroupActions.setSetupNewNameServerGroupVisible(false));
            dispatch(nsGroupActions.setSavedNameServerGroup({...savedNSGroup, success: false}));
            dispatch(nsGroupActions.resetSavedNameServerGroup(null))
        } else if (savedNSGroup.error) {
            message.error({
                content: 'Failed to update user. You might not have enough permissions.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(nsGroupActions.setSavedNameServerGroup({...savedNSGroup, error: null}));
            dispatch(nsGroupActions.resetSavedNameServerGroup(null))
        }
    }, [savedNSGroup])

    const onPopoverVisibleChange = (b: boolean) => {
        if (updateNameServerGroupVisible) {
            setGroupPopupVisible(false)
        } else {
            setGroupPopupVisible(undefined)
        }
    }

    const itemsMenuAction = [
        {
            key: "edit",
            label: (<Button type="text" onClick={() => onClickEdit()}>View</Button>)
        },

    ]
    const actionsMenu = (<Menu items={itemsMenuAction}></Menu>)

    const onClickAddNewSetupKey = () => {return}

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>DNS</Title>
                        <Paragraph><Text>Manage your DNS settings for your network. Your peers will be accessible via </Text><Text type="secondary">peer-name</Text><Text>.netbird.cloud</Text></Paragraph>
                    </Col>
                </Row>
                <Tabs defaultActiveKey="1">
                    <Tabs.TabPane tab={<Title level={5}>Nameservers</Title>} key="1">
                <Row>
                    <Col span={24}>
                        <Paragraph>Add upstream nameservers servers for name resolution</Paragraph>
                        <Space direction="vertical" size="large" style={{display: 'flex'}}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable}
                                           placeholder="Search..." onChange={onChangeTextToSearch}/>
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
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
                                            <Button type="primary" onClick={onClickAddNewSetupKey}>Add Nameserver</Button>
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
                                        pageSize,
                                        showSizeChanger: false,
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} users`)
                                    }}
                                    className="card-table"
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).email.includes(value)}
                                            sorter={(a, b) => ((a as any).email.localeCompare((b as any).email))}
                                            defaultSortOrder='ascend'
                                            render={(text, record, index) => {
                                                return <Button type="text"
                                                               onClick={() => setUserAndView(record as NameserverGroupDataTable)}
                                                               className="tooltip-label">{(text && text.trim() !== "") ? text : (record as NameServerGroup).id}</Button>
                                            }}
                                    />
                                    <Column title="Nameservers" dataIndex="nameservers"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}/>
                                    <Column title="Groups" dataIndex="groupsCount" align="center"
                                            render={(text, record: NameserverGroupDataTable, index) => {
                                                return renderPopoverGroups(text, record.groups, record)
                                            }}
                                    />
                                    <Column title="" align="center" width="30px"
                                            render={(text, record, index) => {
                                                return (
                                                    <Dropdown.Button type="text" overlay={actionsMenu}
                                                                     trigger={["click"]}
                                                                     onVisibleChange={visible => {
                                                                         if (visible) setNsGroupToAction(record as NameserverGroupDataTable)
                                                                     }}></Dropdown.Button>)
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Space>
                    </Col>
                </Row>
                    </Tabs.TabPane>
                    <Tabs.TabPane tab={<Title level={5}>Other Settings</Title>} key="3">
                    </Tabs.TabPane>
                </Tabs>
         </Container>
            <UserUpdate/>
        </>
    )
}

export default DNS;