import React, {Fragment} from 'react';
import {Menu, Transition} from "@headlessui/react";
import {Link} from "react-router-dom";
import {classNames} from "../utils/common";

const EditButton = ({items, handler}) => {

    const handleAction = (action) => {
        handler(action)
    }

    return (
            <Menu as="div">
                <div>
                    <Menu.Button
                        className="whitespace-nowrap text-gray-500 hover:text-gray-400">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                             stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                  d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z"/>
                        </svg>
                    </Menu.Button>
                </div>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-200"
                    enterFrom="transform opacity-100 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <Menu.Items
                        className="absolute right-6 bottom-0 mt-2 rounded-md shadow-lg py-1 bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">

                        {items.map((item, idx) => (
                            <Menu.Item key={item.name}>
                                {({active}) => (
                                    <Link
                                        to="#"
                                        className={classNames(active ? 'bg-gray-100' : 'font-normal', 'block px-4 py-2 text-sm text-gray-700')}
                                        onClick={() => handleAction(item.name)}
                                    >
                                        {item.name}
                                    </Link>
                                )}
                            </Menu.Item>
                        ))}
                    </Menu.Items>
                </Transition>
            </Menu>
    )

}

export default EditButton;