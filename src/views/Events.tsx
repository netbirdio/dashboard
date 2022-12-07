import React, {useEffect, useRef, useState} from 'react';
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
    Menu,
    message,
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
import {useOidcUser} from "@axa-fr/react-oidc";
import {Link} from "react-router-dom";
import {actions as setupKeyActions} from "../store/setup-key";
import {SetupKey} from "../store/setup-key/types";
import {isLocalDev, isNetBirdHosted} from "../utils/common";

const {Title, Paragraph, Text} = Typography;
const {Column} = Table;

interface UserDataTable extends User {
    key: string
}


export const Events = () => {
    const {getAccessTokenSilently} = useGetAccessTokenSilently()
    const {oidcUser} = useOidcUser();
    const dispatch = useDispatch()

    const users = useSelector((state: RootState) => state.user.data);
    const failed = useSelector((state: RootState) => state.user.failed);
    const loading = useSelector((state: RootState) => state.user.loading);
    const updateUserDrawerVisible = useSelector((state: RootState) => state.user.updateUserDrawerVisible)

    const [groupPopupVisible, setGroupPopupVisible] = useState(false as boolean | undefined)
    const [userToAction, setUserToAction] = useState(null as UserDataTable | null);
    const [textToSearch, setTextToSearch] = useState('');
    const [pageSize, setPageSize] = useState(10);
    const [dataTable, setDataTable] = useState([] as UserDataTable[]);
    const [currentUser, setCurrentUser] = useState({} as User)
    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

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

    useEffect(() => {
        if (oidcUser && oidcUser.sub) {
            const found = users.find(u => u.id == oidcUser.sub)
            if (found) {
                setCurrentUser(found)
            }
        } else {
            setCurrentUser({} as User)
        }

    }, [oidcUser, users])

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
            name: userToAction?.name,
            role: userToAction?.role,
        } as User));
    }

    const onClickInviteUser = () => {
        const autoGroups : string[] = []
        dispatch(userActions.setUpdateUserDrawerVisible(true));
        dispatch(userActions.setUser({
            id: "",
            email: "",
            auto_groups: autoGroups,
            name: "",
            role: "user",
        } as User));
    }



    useEffect(() => {
        if (updateUserDrawerVisible) {
            setGroupPopupVisible(false)
        }
    }, [updateUserDrawerVisible])


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
                        <Title level={4}>Events</Title>
                        <Paragraph>Here you can see all the events that happened in your network and account.</Paragraph>
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
                                    {(isNetBirdHosted() || isLocalDev()) &&
                                    <Row justify="end">
                                        <Col>
                                            <Button type="primary" onClick={onClickInviteUser}>Invite User</Button>
                                        </Col>
                                    </Row>}
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.message} description={failed.data ? failed.data.message : " "} type="error" showIcon
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
                                    <Column title="Timestamp" dataIndex="timestamp"/>
                                    <Column title="Event" dataIndex="operation"/>
                                    <Column title="Initiated By" dataIndex="modifier"/>
                                    <Column title="Target" dataIndex="target"/>
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

export default Events;