import React, {useEffect, useState} from 'react';
import {Link} from 'react-router-dom';
import logo from "../assets/logo.png";
import {useAuth0} from "@auth0/auth0-react";
import {useLocation} from 'react-router-dom';
import {Menu, Row, Col, Grid, Dropdown, Avatar, Button, Typography, Space} from 'antd'
import {ItemType} from "antd/lib/menu/hooks/useItems";
import {AvatarSize} from "antd/es/avatar/SizeContext";
import { UserOutlined } from '@ant-design/icons';

const { Text } = Typography
const { useBreakpoint } = Grid;

const Navbar = () => {
    let location = useLocation();
    const {
        user,
        isAuthenticated,
        logout,
    } = useAuth0();

    const screens = useBreakpoint();

    const [hideMenuUser, setHideMenuUser] = useState(false)

    const userEmailKey = 'user-email'
    const userLogoutKey = 'user-logout'
    const userDividerKey = 'user-divider'
    const [menuItems, setMenuItems] = useState([
        { label: (<Link  to="/peers">Peers</Link>), key: '/peers' },
        { label: (<Link  to="/add-peer">Add Peer</Link>), key: '/add-peer' },
        { label: (<Link  to="/setup-keys">Setup Keys</Link>), key: '/setup-keys' },
        { label: (<Link  to="/acls">Access Control</Link>), key: '/acls' },
        // { label: (<Link  to="/activity">Activity</Link>), key: '/activity' },
        { label: (<Link  to="/users">Users</Link>), key: '/users' }
    ] as ItemType[])

    useEffect(() => {
        const fs = menuItems.filter(m => m?.key !== userEmailKey && m?.key !== userLogoutKey && m?.key !== userDividerKey)
        if (screens.xs === true) {
            setHideMenuUser(false)
            fs.push({ type: 'divider', key: userDividerKey })
            fs.push({
                label: (
                    <Link to="#">{user?.name}</Link>
                ),
                icon: createAvatar("small"),
                key: userEmailKey
            })
            fs.push({ label: (<Button type="link" block onClick={logoutWithRedirect}>Logout</Button>), key: userLogoutKey })
            setMenuItems([...fs])
            return
        }
        setMenuItems([...fs])
        setHideMenuUser(true)
    }, [screens])

    const menuUser = (
        <Menu
            items={[
                {
                    label: <>{user?.email}</>,
                    key: '0',
                },
                {
                    label: <a onClick={e => {
                        logoutWithRedirect()
                        e.preventDefault()}
                    }>Logout</a>,
                    key: '1',
                }
            ]}
        />
    );

    const logoutWithRedirect = () =>
        logout({
            returnTo: window.location.origin,
        });

    const createAvatar = (size:AvatarSize) => {
        return user?.picture ? (
            <Avatar size={size} src={user?.picture} icon={<UserOutlined />} />
        ) : (
            <Avatar size={size}>{(user?.name || '').slice(0, 1).toUpperCase()}</Avatar>
        )
    }

    return (
        <>
            <Row justify="space-evenly" align="middle">
                <Col flex="0 1 60px">
                    <Link id="logo" to="/">
                        <img
                            alt="logo"
                            style={{width: "55px"}}
                            src={logo}
                        />
                    </Link>
                </Col>
                <Col flex="1 1 auto">
                    <div>
                        <Menu mode="horizontal" selectable={true} selectedKeys={[location.pathname]} defaultSelectedKeys={[location.pathname]} items={menuItems}/>
                    </div>
                </Col>
                {hideMenuUser &&
                    <Col>
                        <Dropdown overlay={menuUser} placement="bottomRight" trigger={['click']}>
                            {createAvatar("large")}
                        </Dropdown>
                    </Col>
                }
            </Row>
        </>
    );
};

export default Navbar;
