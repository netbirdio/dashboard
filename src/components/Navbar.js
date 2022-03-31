import React, {Fragment} from 'react';
import {Link, NavLink} from 'react-router-dom';
import logo from "../assets/logo.png";
import {Disclosure, Menu, Transition} from '@headlessui/react'
import {MenuIcon, XIcon} from '@heroicons/react/outline'
import {useAuth0} from "@auth0/auth0-react";

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const Navbar = ({toggle}) => {

    const {
        user,
        isAuthenticated,
        logout,
    } = useAuth0();

    const logoutWithRedirect = () =>
        logout({
            returnTo: window.location.origin,
        });

    return (
        <Disclosure as="nav" className="bg-white shadow">
            {({open}) => (
                <>
                    <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
                        <div className="relative flex justify-between h-16">
                            <div className="flex">
                                <div className="flex-shrink-0 flex items-center">
                                    <Link  to="/">
                                        <img
                                            className="block lg:hidden h-10 w-auto"
                                            src={logo}
                                            alt="Workflow"
                                        />
                                        <img
                                            className="hidden lg:block h-10 w-auto"
                                            src={logo}
                                            alt="Workflow"
                                        />
                                    </Link>
                                </div>
                                <div className="hidden sm:ml-16 sm:flex sm:space-x-8">
                                    {/* Current: "border-indigo-500 text-gray-900", Default: "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700" */}
                                    {isAuthenticated && (
                                        <NavLink
                                            to="/peers"
                                            activeClassName="border-indigo-500 text-gray-900 border-b-2"
                                            className="border-indigo-500 text-gray-600 inline-flex items-center px-1 pt-1 text-m"
                                        >
                                            Peers
                                        </NavLink>
                                    )}

                                    {isAuthenticated && (
                                        <NavLink
                                            to="/add-peer"
                                            activeClassName="border-indigo-500 text-gray-900 border-b-2"
                                            className="border-indigo-500 text-gray-600 inline-flex items-center px-1 pt-1 text-m"
                                        >
                                            Add Peer
                                        </NavLink>
                                    )}
                                    {isAuthenticated && (
                                        <NavLink
                                            to="/setup-keys"
                                            activeClassName="border-indigo-500 text-gray-900 border-b-2"
                                            className="border-indigo-500 text-gray-600 inline-flex items-center px-1 pt-1 text-m"
                                        >
                                            Setup Keys
                                        </NavLink>
                                    )}

                                    {isAuthenticated && (
                                        <NavLink
                                            to="/acls"
                                            activeClassName="border-indigo-500 text-gray-900 border-b-2"
                                            className="border-indigo-500 text-gray-600 inline-flex items-center px-1 pt-1 text-m"
                                        >
                                            Access Control
                                        </NavLink>
                                    )}

                                    {isAuthenticated && (
                                        <NavLink
                                            to="/activity"
                                            activeClassName="border-indigo-500 text-gray-900 border-b-2"
                                            className="border-indigo-500 text-gray-600 inline-flex items-center px-1 pt-1 text-m"
                                        >
                                            Activity
                                        </NavLink>
                                    )}

                                </div>
                            </div>
                            <div className="hidden sm:ml-6 sm:flex sm:items-center">
                                <Menu as="div" className="ml-3 relative">
                                    <div>
                                        <Menu.Button
                                            className="bg-white rounded-full flex text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                                            <span className="sr-only">Open user menu</span>
                                            <img
                                                className="h-12 w-auto rounded-full"
                                                src={user.picture}
                                                alt=""
                                            />
                                        </Menu.Button>
                                    </div>
                                    <Transition
                                        as={Fragment}
                                        enter="transition ease-out duration-200"
                                        enterFrom="transform opacity-0 scale-95"
                                        enterTo="transform opacity-100 scale-100"
                                        leave="transition ease-in duration-75"
                                        leaveFrom="transform opacity-100 scale-100"
                                        leaveTo="transform opacity-0 scale-95"
                                    >
                                        <Menu.Items
                                            className="origin-top-right absolute right-0 mt-2 w-48 squared-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
                                            <Menu.Item>
                                                {({active}) => (
                                                    <NavLink
                                                        to="#"
                                                        id="qsLogoutBtn"
                                                        className={classNames(active ? 'bg-gray-100' : 'font-mono', 'block px-4 py-2 text-sm text-gray-700')}
                                                        onClick={() => logoutWithRedirect()}
                                                    >
                                                        Sign out
                                                    </NavLink>
                                                )}
                                            </Menu.Item>
                                        </Menu.Items>
                                    </Transition>
                                </Menu>
                            </div>
                            <div className="-mr-2 flex items-center sm:hidden">
                                {/* Mobile menu button */}
                                <Disclosure.Button
                                    className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500">
                                    <span className="sr-only">Open main menu</span>
                                    {open ? (
                                        <XIcon className="block h-6 w-6" aria-hidden="true"/>
                                    ) : (
                                        <MenuIcon className="block h-6 w-6" aria-hidden="true"/>
                                    )}
                                </Disclosure.Button>
                            </div>
                        </div>
                    </div>

                    <Disclosure.Panel className="sm:hidden">
                        <div className="pt-2 pb-3 space-y-1">
                            {isAuthenticated && (
                                <Link
                                    to="/peers"
                                    className="block px-4 py-2 text-base text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                >
                                    Peers
                                </Link>
                            )}
                            {isAuthenticated && (
                                <Link
                                    to="/add-peer"
                                    className="block px-4 py-2 text-base text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                >
                                    Add Peer
                                </Link>
                            )}
                            {isAuthenticated && (
                                <Link
                                    to="/setup-keys"
                                    className="block px-4 py-2 text-base text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                >
                                    Setup Keys
                                </Link>
                            )}
                            {isAuthenticated && (
                                <Link
                                    to="/acls"
                                    className="block px-4 py-2 text-base text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                >
                                    Access Control
                                </Link>
                            )}
                            {isAuthenticated && (
                                <Link
                                    to="/activity"
                                    className="block px-4 py-2 text-base text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                >
                                    Activity
                                </Link>
                            )}
                        </div>
                        <div className="pt-4 pb-3 border-t border-gray-200">
                            <div className="flex items-center px-4">
                                <div className="flex-shrink-0">
                                    <img
                                        className="h-10 w-10 rounded-full"
                                        src={user.picture}
                                        alt=""
                                    />
                                </div>
                                <div className="ml-3">
                                    <div className="text-base text-gray-800">{user.email}</div>
                                </div>

                            </div>
                            <div className="mt-3 space-y-1">
                                <Link
                                    to="#"
                                    className="block px-4 py-2 text-base text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                                    onClick={() => logoutWithRedirect()}
                                >
                                    Sign out
                                </Link>
                            </div>
                        </div>
                    </Disclosure.Panel>
                </>
            )}
        </Disclosure>
    );
};

export default Navbar;
