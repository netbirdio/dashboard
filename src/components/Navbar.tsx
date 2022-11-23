import React, {useEffect, useState} from 'react';
import {Link, useLocation} from 'react-router-dom';
import logo from "../assets/logo.png";
import {Avatar, Button, Col, Dropdown, Grid, Menu, Row} from 'antd'
import {ItemType} from "antd/lib/menu/hooks/useItems";
import {AvatarSize} from "antd/es/avatar/SizeContext";
import {UserOutlined} from '@ant-design/icons';
import {useOidc, useOidcUser} from '@axa-fr/react-oidc';
import {getConfig} from "../config";
import {User} from "../store/user/types";
import {useSelector} from "react-redux";
import {RootState} from "typesafe-actions";

const {useBreakpoint} = Grid;

const Navbar = () => {
    let location = useLocation();
    const config = getConfig();
    const { logout } = useOidc();

    const {oidcUser} = useOidcUser();
    const user = oidcUser;
    const [currentUser, setCurrentUser] = useState({} as User)

    const screens = useBreakpoint();

    const [hideMenuUser, setHideMenuUser] = useState(false)
    const users = useSelector((state: RootState) => state.user.data)

    const items = [
        {label: (<Link to="/peers">Peers</Link>), key: '/peers'},
        {label: (<Link to="/add-peer">Add Peer</Link>), key: '/add-peer'},
        {label: (<Link to="/setup-keys">Setup Keys</Link>), key: '/setup-keys'},
        {label: (<Link to="/acls">Access Control</Link>), key: '/acls'},
        {label: (<Link to="/routes">Network Routes</Link>), key: '/routes'},
        { label: (<Link  to="/dns">DNS</Link>), key: '/dns' },
        {label: (<Link to="/users">Users</Link>), key: '/users'}
    ] as ItemType[]

    const userEmailKey = 'user-email'
    const userLogoutKey = 'user-logout'
    const userDividerKey = 'user-divider'
    const adminOnlyTabs = ["/setup-keys", "/acls", "/routes", "/dns"]
    const [menuItems, setMenuItems] = useState(items)
    const logoutWithRedirect = () =>
        logout("/", {client_id: config.clientId});

    useEffect(() => {
        const fs = items.filter(m => showTab(m?.key?.toString(), currentUser) && m?.key !== userEmailKey && m?.key !== userLogoutKey && m?.key !== userDividerKey)
        if (screens.xs === true) {
            setHideMenuUser(false)
            fs.push({type: 'divider', key: userDividerKey})
            fs.push({
                label: (
                    <Link to="#">{user?.name}</Link>
                ),
                icon: createAvatar("small"),
                key: userEmailKey
            })
            fs.push({
                label: (<Button type="link" block onClick={logoutWithRedirect}>Logout</Button>),
                key: userLogoutKey
            })
            setMenuItems([...fs])
            return
        }
        setMenuItems([...fs])
        setHideMenuUser(true)
    }, [screens, currentUser])

    useEffect(() => {
        if (oidcUser && oidcUser.sub) {
            const found = users.find(u => u.id == oidcUser.sub)
            if (found) {
                setCurrentUser(found)
            }
        } else {
            setCurrentUser({} as User)
        }
    }, [users, user])

    const showTab = (key: string | undefined, user: User | undefined) => {
        if (!user) {
            return false
        }

        if (user.role?.toLowerCase() === "admin") {
            return true
        }
        return !adminOnlyTabs.find(t => t === key)
    }

    const menuUser = (
        <Menu
            items={[
                {
                    label: <>{user?.email}</>,
                    key: '0',
                },
                {
                    label: (<Link to="/logout" onClick={logoutWithRedirect}>Logout</Link>),
                    key: '1',
                }
            ]}
        />
    );

    const createAvatar = (size: AvatarSize) => {
        return user?.picture ? (
            <Avatar size={size} src={user?.picture} icon={<UserOutlined/>}/>
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
                        <Menu mode="horizontal" selectable={true} selectedKeys={[location.pathname]}
                              defaultSelectedKeys={[location.pathname]} items={menuItems}/>
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
