import React, {useEffect,  useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {RootState} from "typesafe-actions";
import {actions as userActions} from '../store/user';
import {Container} from "../components/Container";
import {
    Alert,
    Button,
    Card,
    Col,
    Input,
    message, Modal,
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
import {useGetTokenSilently} from "../utils/token";
import {actions as groupActions} from "../store/group";
import {isLocalDev, isNetBirdHosted} from "../utils/common";
import {usePageSizeHelpers} from "../utils/pageSize";
import AddServiceUserPopup from "../components/AddServiceUserPopup";
import {ExclamationCircleOutlined} from "@ant-design/icons";

const {Title, Paragraph, Text} = Typography;
const {Column} = Table;

interface UserDataTable extends User {
    key: string
}

const styleNotification = {marginTop: 85}

export const ServiceUsers = () => {
    const {onChangePageSize,pageSizeOptions,pageSize} = usePageSizeHelpers()
    const {getTokenSilently} = useGetTokenSilently()
    const dispatch = useDispatch()

    const groups = useSelector((state: RootState) => state.group.data)
    const user = useSelector((state: RootState) => state.user.user)
    const users = useSelector((state: RootState) => state.user.serviceUsers);
    const failed = useSelector((state: RootState) => state.user.failed);
    const loading = useSelector((state: RootState) => state.user.loading);
    const updateUserDrawerVisible = useSelector((state: RootState) => state.user.updateUserDrawerVisible)
    const savedUser = useSelector((state: RootState) => state.user.savedUser)
    const deletedUser = useSelector((state: RootState) => state.user.deletedUser)

    const [groupPopupVisible, setGroupPopupVisible] = useState(false as boolean | undefined)
    const [confirmModal, confirmModalContextHolder] = Modal.useModal();
    const [textToSearch, setTextToSearch] = useState('');
    const [dataTable, setDataTable] = useState([] as UserDataTable[]);

    const transformDataTable = (d: User[]): UserDataTable[] => {
        return d.map(p => ({key: p.id, ...p} as UserDataTable))
    }

    useEffect(() => {
        dispatch(userActions.getServiceUsers.request({getAccessTokenSilently: getTokenSilently, payload: null}));
        dispatch(groupActions.getGroups.request({getAccessTokenSilently: getTokenSilently, payload: null}));
    }, [savedUser, deletedUser])

    useEffect(() => {
        setDataTable(transformDataTable(users))
    }, [users, groups])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch])

    const filterDataTable = (): User[] => {
        const t = textToSearch.toLowerCase().trim()
        let f: User[] = filter(users, (f: User) =>
            ((f.email || f.id).toLowerCase().includes(t) || f.name.toLowerCase().includes(t) || f.role.includes(t) || t === "")
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

    const onClickCreateServiceUser = () => {
        dispatch(userActions.setUser(null as unknown as User));
        dispatch(userActions.setAddServiceUserPopupVisible(true));
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
            let errorMsg = "Failed to update user"
            switch (savedUser.error.statusCode) {
                case 412:
                    errorMsg = savedUser.error.data
                    break
                case 403:
                    errorMsg = "Failed to update user. You might not have enough permissions."
                    break
            }
            message.error({
                content: errorMsg,
                key: createKey,
                duration: 5,
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

    const handleEditUser = (user: UserDataTable) => {
        dispatch(userActions.setUser({
            id: user.id,
            email: user.email,
            role: user.role,
            auto_groups: user.auto_groups ? user.auto_groups : [],
            name: user.name,
            is_current: user.is_current,
            is_service_user: user.is_service_user,
        } as User));
        dispatch(userActions.setEditUserPopupVisible(true));
    }

    const handleDeleteUser = (user: UserDataTable) => {
        confirmModal.confirm({
            icon: <ExclamationCircleOutlined/>,
            title: "Delete token \"" + user.name + "\"",
            width: 600,
            content: <Space direction="vertical" size="small">
                <Paragraph>Are you sure you want to delete this service user?</Paragraph>
            </Space>,
            onOk() {
                dispatch(userActions.deleteUser.request({
                    getAccessTokenSilently: getTokenSilently,
                    payload: user.id
                }));
                dispatch(userActions.getServiceUsers.request({getAccessTokenSilently: getTokenSilently, payload: null}));
            },
            onCancel() {
                // noop
            },
        });
    }

    return (
        <>
            {!user && <Container style={{padding: "0px"}}>
                <Row>
                    <Col span={24}>
                        <Paragraph>Manage service users and their permissions.</Paragraph>
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
                                                <Button type="primary" onClick={onClickCreateServiceUser}>Create Service User</Button>
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
                                        showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} service users`)
                                    }}
                                    className="card-table"
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}
                                            defaultSortOrder='ascend'
                                            render={(text, record, index) => {
                                                return <Button type="text"
                                                        onClick={() => handleEditUser(record as UserDataTable)}>
                                                    <Text strong>{(text && text.trim() !== "") ? text : (record as User).name}</Text>
                                                </Button>
                                            }}/>
                                    <Column title="Status" dataIndex="status"
                                            align="center"
                                            onFilter={(value: string | number | boolean, record) => (record as any).status.includes(value)}
                                            sorter={(a, b) => ((a as any).status.localeCompare((b as any).status))}
                                            render={(text, record, index) => {
                                                if (text == "active") {
                                                    return <Tag color="green">{text}</Tag>
                                                } else if (text === "invited"){
                                                    return <Tag color="gold">{text}</Tag>
                                                }
                                                return <Tag color="red">{text}</Tag>
                                            }}
                                    />
                                    <Column title="Role" dataIndex="role"
                                            onFilter={(value: string | number | boolean, record) => (record as any).role.includes(value)}
                                            sorter={(a, b) => ((a as any).role.localeCompare((b as any).role))}/>
                                    <Column title="" align="center" width="250px"
                                            render={(text, record, index) => {
                                                return (
                                                        <Button danger={true} type={"text"} style={{marginLeft: "3px", marginRight: "3px"}}
                                                                onClick={() => {
                                                                    let userRecord = (record as UserDataTable)
                                                                    handleDeleteUser(userRecord)
                                                                }}
                                                        >Delete</Button>
                                                )
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Space>
                    </Col>
                </Row>
            </Container>}
            <AddServiceUserPopup/>
            {confirmModalContextHolder}
        </>
    )
}

export default ServiceUsers;