import {Fragment, useEffect, useState} from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { XIcon } from '@heroicons/react/outline'
import { LinkIcon, PlusSmIcon, QuestionMarkCircleIcon } from '@heroicons/react/solid'
import PropTypes from "prop-types";
import DeleteDialog from "./DeleteDialog";

const team = [
    {
        name: 'Tom Cook',
        email: 'tomcook@example.com',
        href: '#',
        imageUrl:
            'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
        name: 'Whitney Francis',
        email: 'whitneyfrancis@example.com',
        href: '#',
        imageUrl:
            'https://images.unsplash.com/photo-1517365830460-955ce3ccd263?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
        name: 'Leonard Krasner',
        email: 'leonardkrasner@example.com',
        href: '#',
        imageUrl:
            'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
        name: 'Floyd Miles',
        email: 'floydmiles@example.com',
        href: '#',
        imageUrl:
            'https://images.unsplash.com/photo-1463453091185-61582044d556?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
    {
        name: 'Emily Selman',
        email: 'emilyselman@example.com',
        href: '#',
        imageUrl:
            'https://images.unsplash.com/photo-1502685104226-ee32379fefbe?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=facearea&facepad=2&w=256&h=256&q=80',
    },
]

const NewSetupKeyDialog = ({show, closeCallback}) => {
    const [open, setOpen] = useState(show)

    useEffect(() => {
        setOpen(show)
    }, [show]);

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 overflow-hidden" onClose={() => {
                closeCallback()
            }}>
                <div className="absolute inset-0 overflow-hidden">
                    <Dialog.Overlay className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"/>

                    <div className="fixed inset-y-0 right-0 pl-10 max-w-full flex sm:pl-16">
                        <Transition.Child
                            as={Fragment}
                            enter="transform transition ease-in-out duration-500 sm:duration-700"
                            enterFrom="translate-x-full"
                            enterTo="translate-x-0"
                            leave="transform transition ease-in-out duration-500 sm:duration-700"
                            leaveFrom="translate-x-0"
                            leaveTo="translate-x-full"
                        >
                            <div className="w-screen max-w-2xl">
                                <form className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="px-4 py-6 bg-gray-50 sm:px-6">
                                            <div className="flex items-start justify-between space-x-3">
                                                <div className="space-y-1">
                                                    <Dialog.Title className="text-lg font-mono text-gray-900">New setup key</Dialog.Title>
                                                    <p className="text-sm text-gray-500">
                                                        Setup keys allow you to enroll new peers
                                                    </p>
                                                </div>
                                                <div className="h-7 flex items-center">
                                                    <button
                                                        type="button"
                                                        className="text-gray-400 hover:text-gray-500"
                                                        onClick={() => {
                                                            closeCallback()
                                                        }}
                                                    >
                                                        <span className="sr-only">Close panel</span>
                                                        <XIcon className="h-6 w-6" aria-hidden="true" />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Divider container */}
                                        <div className="py-6 space-y-6 sm:py-0 sm:space-y-0 sm:divide-y sm:divide-gray-200">

                                            <div className="space-y-1 px-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 sm:py-5">
                                                <div>
                                                    <label
                                                        htmlFor="project-name"
                                                        className="block text-m font-mono text-gray-900 sm:mt-px sm:pt-2"
                                                    >
                                                        Name
                                                    </label>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <input
                                                        type="text"
                                                        name="setup-key-name"
                                                        id="setup-key-name"
                                                        className="block w-full shadow-sm sm:text-sm focus:ring-gray-500 squared focus:border-gray-500 border border-gray-300"
                                                    />
                                                </div>
                                            </div>


                                            {/* Privacy */}
                                            <fieldset>
                                                <div className="space-y-2 px-4 sm:space-y-0 sm:grid sm:grid-cols-3 sm:gap-4 sm:items-start sm:px-6 sm:py-5">
                                                    <div>
                                                        <legend className="text-m font-mono text-gray-900">Type</legend>
                                                    </div>
                                                    <div className="space-y-5 sm:col-span-2">
                                                        <div className="space-y-5 sm:mt-0">
                                                            <div className="relative flex items-start">
                                                                <div className="absolute flex items-center h-5">
                                                                    <input
                                                                        id="public-access"
                                                                        name="privacy"
                                                                        aria-describedby="public-access-description"
                                                                        type="radio"
                                                                        className="focus:ring-gray-500 h-4 w-4 text-gray-600 border-gray-300"
                                                                        defaultChecked
                                                                    />
                                                                </div>
                                                                <div className="pl-7 text-m">
                                                                    <label htmlFor="public-access" className="font-mono text-gray-900">
                                                                        Reusable
                                                                    </label>
                                                                    <p id="public-access-description" className="text-gray-500">
                                                                        Multiple use
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="relative flex items-start">
                                                                <div className="absolute flex items-center h-5">
                                                                    <input
                                                                        id="restricted-access"
                                                                        name="privacy"
                                                                        aria-describedby="restricted-access-description"
                                                                        type="radio"
                                                                        className="focus:ring-gray-500 h-4 w-4 text-gray-600 border-gray-300"
                                                                    />
                                                                </div>
                                                                <div className="pl-7 text-m">
                                                                    <label htmlFor="restricted-access" className="font-mono text-gray-900">
                                                                        One-off
                                                                    </label>
                                                                    <p id="restricted-access-description" className="text-gray-500">
                                                                        Can be used only once
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                        <hr className="border-gray-200" />
                                                        <div className="flex flex-col space-between space-y-4 sm:flex-row sm:items-center sm:space-between sm:space-y-0">
                                                            <div>
                                                                <a
                                                                    href="#"
                                                                    className="group flex items-center text-sm text-gray-500 hover:text-gray-900 space-x-2.5"
                                                                >
                                                                    <QuestionMarkCircleIcon
                                                                        className="h-5 w-5 text-gray-400 group-hover:text-gray-500"
                                                                        aria-hidden="true"
                                                                    />
                                                                    <span>Learn more about setup keys</span>
                                                                </a>
                                                            </div>
                                                        </div>
                                                    </div>
                                                </div>
                                            </fieldset>
                                        </div>
                                    </div>

                                    {/* Action buttons */}
                                    <div className="flex-shrink-0 px-4 border-t border-gray-200 py-5 sm:px-6">
                                        <div className="space-x-3 flex justify-end">
                                            <button
                                                type="button"
                                                className="bg-white py-2 px-4 border border-gray-300 squared-md shadow-sm text-sm font-mono text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                                onClick={() => {
                                                    closeCallback()
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-mono squared-md text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                            >
                                                Create
                                            </button>
                                        </div>
                                    </div>
                                </form>
                            </div>
                        </Transition.Child>
                    </div>
                </div>
            </Dialog>
        </Transition.Root>
    )
}

NewSetupKeyDialog.propTypes = {
    show: PropTypes.bool,
    closeCallback: PropTypes.func,
    /*text: PropTypes.string*/
};

NewSetupKeyDialog.defaultProps = {};

export default NewSetupKeyDialog;