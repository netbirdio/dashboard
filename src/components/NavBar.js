import React, {useState} from "react";
import {NavLink as RouterNavLink} from "react-router-dom";
import {FontAwesomeIcon} from "@fortawesome/react-fontawesome";

import {Container, Nav, Navbar, NavDropdown} from "react-bootstrap";

import {useAuth0} from "@auth0/auth0-react";

const NavBar = () => {
    const [isOpen, setIsOpen] = useState(false);
    const {
        user,
        isAuthenticated,
        logout,
    } = useAuth0();
    const toggle = () => setIsOpen(!isOpen);

    const logoutWithRedirect = () =>
        logout({
            returnTo: window.location.origin,
        });

    return (
        <Navbar bg="light" expand="md" className="border-bottom">
            <Container>
                <Navbar.Brand className="logo"/>
                <Navbar.Toggle aria-controls="responsive-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="me-auto">
                        {isAuthenticated && (
                            <Nav.Item>
                                <Nav.Link
                                    as={RouterNavLink}
                                    to="/peers"
                                    exact
                                    activeClassName="router-link-exact-active"
                                >
                                    Peers
                                </Nav.Link>
                            </Nav.Item>
                        )}
                        {isAuthenticated && (
                            <Nav.Item>
                                <Nav.Link
                                    as={RouterNavLink}
                                    to="/setup-keys"
                                    exact
                                    activeClassName="router-link-exact-active"
                                >
                                    Setup Keys
                                </Nav.Link>
                            </Nav.Item>
                        )}
                        {isAuthenticated && (
                            <Nav.Item>
                                <Nav.Link
                                    as={RouterNavLink}
                                    to="/acls"
                                    exact
                                    activeClassName="router-link-exact-active"
                                >
                                    Access Control
                                </Nav.Link>
                            </Nav.Item>
                        )}
                        {isAuthenticated && (
                            <Nav.Item>
                                <Nav.Link
                                    as={RouterNavLink}
                                    to="/logs"
                                    exact
                                    activeClassName="router-link-exact-active"
                                >
                                    Activity
                                </Nav.Link>
                            </Nav.Item>
                        )}
                    </Nav>
                    <Nav className="d-none d-md-block" navbar>
                        {isAuthenticated && (
                            <NavDropdown id="profileDropDown" title={
                                <img
                                    src={user.picture}
                                    alt="Profile"
                                    className="nav-user-profile rounded-circle"
                                    width="50"
                                />
                            }>
                                <NavDropdown.Item>
                                    <b>{user.name}</b>
                                </NavDropdown.Item>
                                <NavDropdown.Item
                                    as={RouterNavLink}
                                    to="/profile"
                                    className="dropdown-profile"
                                    activeClassName="router-link-exact-active"
                                >
                                    <FontAwesomeIcon icon="user" className="mr-3"/> Profile
                                </NavDropdown.Item>
                                <NavDropdown.Item
                                    id="qsLogoutBtn"
                                    onClick={() => logoutWithRedirect()}
                                >
                                    <FontAwesomeIcon icon="power-off" className="mr-3"/> Log
                                    out
                                </NavDropdown.Item>
                            </NavDropdown>
                        )}
                    </Nav>
                    {isAuthenticated && (
                        <Nav
                            className="d-md-none justify-content-between"
                            navbar
                            style={{minHeight: 170}}
                        >
                            <Nav.Item>
                  <span className="user-info">
                    <img
                        src={user.picture}
                        alt="Profile"
                        className="nav-user-profile d-inline-block rounded-circle mr-3"
                        width="50"
                    />
                    <h6 className="d-inline-block">{user.name}</h6>
                  </span>
                            </Nav.Item>
                            <Nav.Item>
                                <FontAwesomeIcon icon="user" className="mr-3"/>
                                <RouterNavLink
                                    to="/profile"
                                    activeClassName="router-link-exact-active"
                                >
                                    Profile
                                </RouterNavLink>
                            </Nav.Item>
                            <Nav.Item>
                                <FontAwesomeIcon icon="power-off" className="mr-3"/>
                                <RouterNavLink
                                    to="#"
                                    id="qsLogoutBtn"
                                    onClick={() => logoutWithRedirect()}
                                >
                                    Log out
                                </RouterNavLink>
                            </Nav.Item>
                        </Nav>
                    )}
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default NavBar;
