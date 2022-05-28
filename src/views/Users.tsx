import React, {useEffect, useState} from 'react';
import {useDispatch, useSelector} from "react-redux";
import { RootState } from "typesafe-actions";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import { actions as userActions } from '../store/user';
import Loading from "../components/Loading";
import {Container} from "../components/Container";
import {
    Col,
    Row,
    Typography,
    Table,
    Card,
    Space, Input, Radio, Select, Alert, Tag, Dropdown
} from "antd";
import { User } from "../store/user/types";
import {filter} from "lodash";
import {formatOS, timeAgo} from "../utils/common";

const { Title, Paragraph } = Typography;
const { Column } = Table;

interface UserDataTable extends User {
    key: string
}

export const Activity = () => {
    const { getAccessTokenSilently } = useAuth0()
    const dispatch = useDispatch()

    const users = useSelector((state: RootState) => state.user.data);
    const failed = useSelector((state: RootState) => state.peer.failed);

    const [textToSearch, setTextToSearch] = useState('');
    const [pageSize, setPageSize] = useState(5);
    const [dataTable, setDataTable] = useState([] as UserDataTable[]);
    const pageSizeOptions = [
        {label: "5", value: "5"},
        {label: "10", value: "10"},
        {label: "15", value: "15"}
    ]

    const transformDataTable = (d:User[]):UserDataTable[] => {
        return d.map(p => ({ key: p.id, ...p } as UserDataTable))
    }

    useEffect(() => {
        dispatch(userActions.getUsers.request({getAccessTokenSilently, payload: null}));
    }, [])
    useEffect(() => {
        setDataTable(transformDataTable(users))
    }, [users])

    useEffect(() => {
        setDataTable(transformDataTable(filterDataTable()))
    }, [textToSearch])

    const filterDataTable = ():User[] => {
        const t = textToSearch.toLowerCase().trim()
        let f:User[] = filter(users, (f:User) =>
            (f.email.toLowerCase().includes(t) || f.name.includes(t) || f.role.includes(t) || t === "")
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

    return(
        <Container style={{paddingTop: "40px"}}>
            <Row>
                <Col span={24}>
                    <Title level={4}>Users</Title>
                    <Paragraph>A list of all Users</Paragraph>
                    <Space direction="vertical" size="large" style={{ display: 'flex' }}>
                        <Row gutter={[16, 24]}>
                            <Col xs={24} sm={24} md={8} lg={8} xl={8} xxl={8} span={8}>
                                <Input allowClear value={textToSearch} onPressEnter={searchDataTable} placeholder="Search..." onChange={onChangeTextToSearch} />
                            </Col>
                            <Col xs={24} sm={24} md={11} lg={11} xl={11} xxl={11} span={11}>
                                <Space size="middle">
                                    <Select value={pageSize.toString()} options={pageSizeOptions} onChange={onChangePageSize} className="select-rows-per-page-en"/>
                                </Space>
                            </Col>
                        </Row>
                        {failed &&
                            <Alert message={failed.code} description={failed.message} type="error" showIcon closable/>
                        }
                        <Card bodyStyle={{padding: 0}}>
                            <Table
                                pagination={{pageSize, showTotal: ((total, range) => `Showing ${range[0]} to ${range[1]} of ${total} users`)}}
                                className="card-table"
                                scroll={{x: true}}
                                dataSource={dataTable}>
                                <Column title="Email" dataIndex="email"
                                        onFilter={(value: string | number | boolean, record) => (record as any).email.includes(value)}
                                        sorter={(a, b) => ((a as any).email.localeCompare((b as any).email))} />
                                <Column title="Name" dataIndex="name"
                                        onFilter={(value: string | number | boolean, record) => (record as any).name.includes(value)}
                                        sorter={(a, b) => ((a as any).name.localeCompare((b as any).name))} />
                                <Column title="Role" dataIndex="role"
                                        onFilter={(value: string | number | boolean, record) => (record as any).role.includes(value)}
                                        sorter={(a, b) => ((a as any).role.localeCompare((b as any).role))} />
                            </Table>
                        </Card>
                    </Space>
                </Col>
            </Row>
        </Container>
    )
}

export default withAuthenticationRequired(Activity,
    {
        onRedirecting: () => <Loading/>,
    }
);