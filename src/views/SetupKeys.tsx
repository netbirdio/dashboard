import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import { RootState } from "typesafe-actions";
import { actions as setupKeyActions } from '../store/setup-key';
import Loading from "../components/Loading";
import {Container} from "../components/Container";
import {
    Col,
    Row,
    Typography,
    Table,
    Card,
    Tag,
    Input,
    Space,
    Radio,
    RadioChangeEvent,
    Dropdown,
    Menu,
    Alert, Select, Modal, Button, message, Drawer, Form, List
} from "antd";
import {SetupKey, SetupKeyRevoke} from "../store/setup-key/types";
import {filter, transform} from "lodash"
import {copyToClipboard, formatDate, formatOS, timeAgo} from "../utils/common";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import SetupKeyNew from "../components/SetupKeyNew";
import ButtonCopyMessage from "../components/ButtonCopyMessage";
import TableSpin from "../components/Spin";
import tableSpin from "../components/Spin";

const { Title, Text, Paragraph } = Typography;
const { Column } = Table;
const { confirm } = Modal;

interface SetupKeyDataTable extends SetupKey {
    key: string
}

export const SetupKeys = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const setupKeys = useSelector((state: RootState) => state.setupKey.data);
    const failed = useSelector((state: RootState) => state.setupKey.failed);
    const loading = useSelector((state: RootState) => state.setupKey.loading);
    const deletedSetupKey = useSelector((state: RootState) => state.setupKey.deletedSetupKey);
    const revokedSetupKey = useSelector((state: RootState) => state.setupKey.revokedSetupKey);
    const createdSetupKey = useSelector((state: RootState) => state.setupKey.createdSetupKey);

    const [textToSearch, setTextToSearch] = useState('');
    const [optionValidAll, setOptionValidAll] = useState('valid');
    const [pageSize, setPageSize] = useState(5);
    const [dataTable, setDataTable] = useState([] as SetupKeyDataTable[]);
    const [setupKeyToAction, setSetupKeyToAction] = useState(null as SetupKeyDataTable | null);

    const styleNotification = { marginTop: 85 }

    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const optionsValidAll = [{label: 'Valid', value: 'valid'}, {label: 'All', value: 'all'}]

    const itemsMenuAction = [
        {
            key: "revoke",
            label: (<Button type="text" onClick={() => showConfirmRevoke()}>Revoke</Button>)
        },
        /*{
            key: "delete",
            label: (<Button type="text" onClick={() => showConfirmDelete()}>Delete</Button>)
        }*/
    ]
    const actionsMenu = (<Menu items={itemsMenuAction} ></Menu>)

    const transformDataTable = (d:SetupKey[]):SetupKeyDataTable[] => {
        return d.map(p => ({ ...p } as SetupKeyDataTable))
    }

    useEffect(() => {
        dispatch(setupKeyActions.getSetupKeys.request({getAccessTokenSilently, payload: null}));
    }, [])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [setupKeys])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch, optionValidAll])

    const deleteKey = 'deleting';
    useEffect(() => {
        if (deletedSetupKey.loading) {
            message.loading({ content: 'Deleting...', key: deleteKey, style: styleNotification });
        } else if (deletedSetupKey.success) {
            message.success({ content: 'Setup key has been successfully removed.', key: deleteKey, duration: 2, style: styleNotification });
            dispatch(setupKeyActions.setDeleteSetupKey({ ...deletedSetupKey, success: false }))
            dispatch(setupKeyActions.resetDeletedSetupKey(null))
        } else if (deletedSetupKey.error) {
            message.error({ content: 'Failed to delete setup key. You might not have enough permissions.', key: deleteKey, duration: 2, style: styleNotification  });
            dispatch(setupKeyActions.setDeleteSetupKey({ ...deletedSetupKey, error: null }))
            dispatch(setupKeyActions.resetDeletedSetupKey(null))
        }
    }, [deletedSetupKey])

    const revokeKey = 'revoking';
    useEffect(() => {
        if (revokedSetupKey.loading) {
            message.loading({ content: 'Revoking...', key: revokeKey, duration: 0, style: styleNotification })
        } else if (revokedSetupKey.success) {
            message.success({ content: 'Setup key has been successfully revoked.', key: revokeKey, duration: 2, style: styleNotification });
            dispatch(setupKeyActions.resetRevokedSetupKey(null))
        } else if (revokedSetupKey.error) {
            message.error({ content: 'Failed to revoke setup key. You might not have enough permissions.', key: revokeKey, duration: 2, style: styleNotification  });
            dispatch(setupKeyActions.resetRevokedSetupKey(null))
        }
    }, [revokedSetupKey])

    const createKey = 'creating';
    useEffect(() => {
        if (createdSetupKey.loading) {
            message.loading({ content: 'Creating...', key: createKey, duration: 0, style: styleNotification });
        } else if (createdSetupKey.success) {
            message.success({ content: 'Setup key has been successfully created.', key: createKey, duration: 2, style: styleNotification });
            dispatch(setupKeyActions.setSetupNewKeyVisible(false));
            dispatch(setupKeyActions.setCreateSetupKey({ ...createdSetupKey, success: false }));
        } else if (createdSetupKey.error) {
            message.error({ content: 'Failed to create setup key. You might not have enough permissions.', key: createKey, duration: 2, style: styleNotification  });
            dispatch(setupKeyActions.setCreateSetupKey({ ...createdSetupKey, error: null }));
        }
    }, [createdSetupKey])

    const filterDataTable = ():SetupKey[] => {
        const t = textToSearch.toLowerCase().trim()
        let f:SetupKey[] = [...setupKeys]
        if (optionValidAll === "valid") {
            f = filter(setupKeys, (_f:SetupKey) => _f.valid && !_f.revoked)
        }
        f = filter(f, (_f:SetupKey) =>
            (_f.name.toLowerCase().includes(t) || _f.state.includes(t) || _f.type.toLowerCase().includes(t) || _f.key.toLowerCase().includes(t) || t === "")
        ) as SetupKey[]
        return f
    }

    const onChangeTextToSearch = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        setTextToSearch(e.target.value)
    };

    const searchDataTable = () => {
        const data = filterDataTable()
        setDataTable(transformDataTable(data))
    }

    const onChangeValidAll = ({ target: { value } }: RadioChangeEvent) => {
        setOptionValidAll(value)
    }

    const onChangePageSize = (value: string) => {
        setPageSize(parseInt(value.toString()))
    }

    const showConfirmDelete = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {setupKeyToAction &&
                    <>
                        <Title level={5}>Delete setupKey "{setupKeyToAction ? setupKeyToAction.name : ''}"</Title>
                        <Paragraph>Are you sure you want to delete key?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(setupKeyActions.deleteSetupKey.request({getAccessTokenSilently, payload: setupKeyToAction ? setupKeyToAction.id : ''}));
            },
            onCancel() {
                setSetupKeyToAction(null);
            },
        });
    }

    const showConfirmRevoke = () => {
        confirm({
            icon: <ExclamationCircleOutlined />,
            width: 600,
            content: <Space direction="vertical" size="small">
                {setupKeyToAction &&
                    <>
                        <Title level={5}>Revoke setupKey "{setupKeyToAction ? setupKeyToAction.name : ''}"</Title>
                        <Paragraph>Are you sure you want to revoke key?</Paragraph>
                    </>
                }
            </Space>,
            okType: 'danger',
            onOk() {
                dispatch(setupKeyActions.revokeSetupKey.request({getAccessTokenSilently, payload: { id: setupKeyToAction ? setupKeyToAction.id : null,revoked: true } as SetupKeyRevoke}));
            },
            onCancel() {
                setSetupKeyToAction(null);
            },
        });
    }

    const onClickAddNewSetupKey = () => {
        dispatch(setupKeyActions.setSetupNewKeyVisible(true));
        dispatch(setupKeyActions.setSetupKey({
            name: '',
            type: 'reusable'
        } as SetupKey))
    }

    return (
        <>
            <Container style={{paddingTop: "40px"}}>
                <Row>
                    <Col span={24}>
                        <Title level={4}>Setup Keys</Title>
                        <Paragraph>A list of all the setup keys in your account including their name, state, type and expiration.</Paragraph>
                        <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                            <Row gutter={[16, 24]}>
                                <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                    {/*<Input.Search allowClear value={textToSearch} onPressEnter={searchDataTable} onSearch={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />*/}
                                    <Input allowClear value={textToSearch} onPressEnter={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />
                                </Col>
                                <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                    <Space size="middle">
                                        <Radio.Group
                                            options={optionsValidAll}
                                            onChange={onChangeValidAll}
                                            value={optionValidAll}
                                            optionType="button"
                                            buttonStyle="solid"
                                        />
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
                                            <Button type="primary" onClick={onClickAddNewSetupKey}>Add Key</Button>
                                        </Col>
                                    </Row>
                                </Col>
                            </Row>
                            {failed &&
                                <Alert message={failed.code} description={failed.message} type="error" showIcon closable/>
                            }
                            <Card bodyStyle={{padding: 0}}>
                                <Table
                                    pagination={{pageSize, showSizeChanger: false, showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} setup keys`)}}
                                    className="card-table"
                                    showSorterTooltip={false}
                                    scroll={{x: true}}
                                    loading={tableSpin(loading)}
                                    dataSource={dataTable}>
                                    <Column title="Name" dataIndex="name"
                                            onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                            sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))}
                                    />

                                    <Column title="State" dataIndex="state"
                                            render={(text, record, index) => {
                                                return (text === 'valid') ? <Tag color="green">{text}</Tag> : <Tag color="red">{text}</Tag>
                                            }}
                                            sorter={(a, b) => ((a as any).state.localeCompare((b as any).state))}
                                    />

                                    <Column title="Type" dataIndex="type"
                                            onFilter={(value: string | number | boolean, record) => (record as any).type.includes(value)}
                                            sorter={(a, b) => ((a as any).type.localeCompare((b as any).type))}
                                    />

                                    <Column title="Key" dataIndex="key"
                                            onFilter={(value: string | number | boolean, record) => (record as any).key.includes(value)}
                                            sorter={(a, b) => ((a as any).key.localeCompare((b as any).key))}
                                            render={(text, record, index) => {
                                                return <ButtonCopyMessage keyMessage={(record as SetupKeyDataTable).key} text={text} messageText={`Key copied!`} styleNotification={{}}/>
                                            }}
                                    />

                                    <Column title="Last Used" dataIndex="last_used"
                                            sorter={(a, b) => ((a as any).last_used.localeCompare((b as any).last_used))}
                                            render={(text, record, index) => {
                                                return !(record as SetupKey).used_times ? 'unused' : timeAgo(text)
                                            }}
                                    />
                                    <Column title="Used Times" dataIndex="used_times"
                                            sorter={(a, b) => ((a as any).used_times - ((b as any).used_times))}
                                    />

                                    <Column title="Expires" dataIndex="expires"
                                            render={(text, record, index) => {
                                                return formatDate(text)
                                            }}
                                    />

                                    <Column title="" align="center"
                                            render={(text, record, index) => {
                                                return !(record as SetupKeyDataTable).revoked ? (
                                                    <Dropdown.Button type="text" overlay={actionsMenu} trigger={["click"]}
                                                                        onVisibleChange={visible => {
                                                                            if (visible) setSetupKeyToAction(record as SetupKeyDataTable)
                                                                        }}></Dropdown.Button>) : <></>
                                            }}
                                    />
                                </Table>
                            </Card>
                        </Space>
                    </Col>
                </Row>

            </Container>
            <SetupKeyNew/>
        </>
    )
}

export default withAuthenticationRequired(SetupKeys,
    {
        onRedirecting: () => <Loading padding="3em" width="50px" height="50px"/>,
    }
);