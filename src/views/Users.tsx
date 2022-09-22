import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as userActions} from '../store/user';
import {Container} from "../components/Container";
import {
    Alert,
    Button,
    Card,
    Col,
    Dropdown,
    Input,
    Menu, message,
    Popover,
    Row,
    Select,
    Space,
    Table,
    Tag,
    Typography,
} from "antd";
import {User} from "../store/user/types";
import {filter} from "lodash";
import tableSpin from "../components/Spin";
import {useGetAccessTokenSilently} from "../utils/token";
import UserUpdate from "../components/UserUpdate";
import {actions as groupActions} from "../store/group";
import {Group} from "../store/group/types";
import {TooltipPlacement} from "antd/es/tooltip";

const {Title, Paragraph} = Typography;
const {Column} = Table;

interface UserDataTable extends User {
    key: string
}

const styleNotification = {marginTop: 85}

export const Users = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const dispatch = useDispatch()

    const groups = useSelector((state: RootState) => state.group.data)
    const users = useSelector((state: RootState) => state.user.data);
    const failed = useSelector((state: RootState) => state.user.failed);
    const loading = useSelector((state: RootState) => state.user.loading);
    const updateUserDrawerVisible = useSelector((state: RootState) => state.user.updateUserDrawerVisible)
    const savedUser = useSelector((state: RootState) => state.user.savedUser)

    const [groupPopupVisible, setGroupPopupVisible] = useState(false as boolean | undefined)
    const [userToAction, setUserToAction] = useState(null as UserDataTable | null);
    const [textToSearch, setTextToSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [dataTable, setDataTable] = useState([] as UserDataTable[]);
    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    // setUserAndView makes the UserUpdate drawer visible (right side) and sets the user object
    const setUserAndView = (user: User) => {
        dispatch(userActions.setUpdateUserDrawerVisible(true));
        dispatch(userActions.setUser({
            id: user.id,
            email: user.email,
            auto_groups: user.auto_groups ? user.auto_groups : [],
            name: user.name
        } as User));
    }

    const transformDataTable = (d: User[]): UserDataTable[] => {
        return d.map(p => ({key: p.id, ...p} as UserDataTable))
    }

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
        dispatch(groupActions.getGroups.request({getAccessTokenSilently: getAccessTokenSilently, payload: null}));
    }, [])
    useEffect(() => {
        setDataTable(transformDataTable(users))
    }, [users])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch])

    const filterDataTable = (): User[] => {
        const t = textToSearch.toLowerCase().trim()
        let f: User[] = filter(users, (f: User) =>
            ((f.email || f.id).toLowerCase().includes(t) || f.name.includes(t) || f.role.includes(t) || t === "")
        ) as User[]
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
        dispatch(userActions.setUpdateUserDrawerVisible(true));
        dispatch(userActions.setUser({
            id: userToAction?.id,
            email: userToAction?.email,
            auto_groups: userToAction?.auto_groups ? userToAction?.auto_groups : [],
            name: userToAction?.name
        } as User));
    }

    const renderPopoverGroups = (label: string, rowGroups: string[] | string[] | null, userToAction: UserDataTable) => {

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
                     onVisibleChange={onPopoverVisibleChange}
                     visible={groupPopupVisible}
                     content={mainContent}
                     title={null}>
                {btn}
            </Popover>
        )
    }

    useEffect(() => {
        if (updateUserDrawerVisible) {
            setGroupPopupVisible(false)
        }
    }, [updateUserDrawerVisible])

    const createKey = 'saving';
    useEffect(() => {
        if (savedUser.loading) {
            message.loading({content: 'Saving...', key: createKey, duration: 0, style: styleNotification});
        } else if (savedUser.success) {
            message.success({
                content: 'User has been successfully saved.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(userActions.setUpdateUserDrawerVisible(false));
            dispatch(userActions.setSavedUser({...savedUser, success: false}));
            dispatch(userActions.resetSavedUser(null))
        } else if (savedUser.error) {
            message.error({
                content: 'Failed to update user. You might not have enough permissions.',
                key: createKey,
                duration: 2,
                style: styleNotification
            });
            dispatch(userActions.setSavedUser({...savedUser, error: null}));
            dispatch(userActions.resetSavedUser(null))
        }
    }, [savedUser])

    const onPopoverVisibleChange = (b: boolean) => {
        if (updateUserDrawerVisible) {
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

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Users</Title>
                        <Paragraph>A list of all Users</Paragraph>
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
                                    <Column title="Email" dataIndex="email"
                                            onFilter={(value: string | number | boolean, record) => (record as any).email.includes(value)}
                                            sorter={(a, b) => ((a as any).email.localeCompare((b as any).email))}
                                            defaultSortOrder='ascend'
                                            render={(text, record, index) => {
                                                return <Button type="text"
                                                               onClick={() => setUserAndView(record as UserDataTable)}
                                                               className="tooltip-label">{(text && text.trim() !== "") ? text : (record as User).id}</Button>
                                            }}
                                    />
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}/>
                                    <Column title="Groups" dataIndex="groupsCount" align="center"
                                            render={(text, record: UserDataTable, index) => {
                                                return renderPopoverGroups(text, record.auto_groups, record)
                                            }}
                                    />
                                    <Column title="Role" dataIndex="role"
                                            onFilter={(value: string | number | boolean, record) => (record as any).role.includes(value)}
                                            sorter={(a, b) => ((a as any).role.localeCompare((b as any).role))}/>
                                    <Column title="" align="center" width="30px"
                                            render={(text, record, index) => {
                                                return (
                                                    <Dropdown.Button type="text" overlay={actionsMenu}
                                                                     trigger={["click"]}
                                                                     onVisibleChange={visible => {
                                                                         if (visible) setUserToAction(record as UserDataTable)
                                                                     }}></Dropdown.Button>)
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Container>
            <UserUpdate/>
        </>
    )
}

export default Users;