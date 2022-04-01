import {Fragment, useEffect, useState} from 'react'
import {Dialog, RadioGroup, Transition} from '@headlessui/react'
import {XIcon} from '@heroicons/react/outline'
import {ExclamationCircleIcon, QuestionMarkCircleIcon} from '@heroicons/react/solid'
import PropTypes from "prop-types";
import {Link} from "react-router-dom";

const types = [
    {name: 'Reusable', description: 'This type of a setup key allows to setup multiple machine', value: 'reusable'},
    {name: 'One-off', description: 'This key can be used only once', value: 'one-off'},
]

function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

const NewSetupKeyDialog = ({show, closeCallback}) => {
    const [open, setOpen] = useState(show)
    const [keyName, setKeyName] = useState("")
    const [selectedType, setSelectedType] = useState(types[0])

    useEffect(() => {
        setOpen(show)
        setKeyName("")
        setSelectedType(types[0])
    }, [show]);

    return (
        <Transition.Root show={open} as={Fragment}>
            <Dialog as="div" className="fixed inset-0 overflow-hidden" onClose={() => {
                closeCallback(true, null, null, null)
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
                            <div className="w-screen max-w-lg">
                                <form className="h-full flex flex-col bg-white shadow-xl overflow-y-scroll">
                                    <div className="flex-1">
                                        {/* Header */}
                                        <div className="px-4 py-6 bg-white sm:px-6">
                                            <div className="flex items-start justify-between space-x-3">
                                                <div className="space-y-1">
                                                    <Dialog.Title className="text-lg font-medium text-gray-700">New setup key</Dialog.Title>
                                                    <p className="text-sm text-gray-500">
                                                        Setup keys allow you to enroll new peers
                                                    </p>
                                                </div>

                                                <div className="h-7 flex items-center">
                                                    <button
                                                        type="button"
                                                        className="text-gray-400 hover:text-gray-500"
                                                        onClick={() => {
                                                            closeCallback(true, null, null, null)
                                                        }}
                                                    >
                                                        <span className="sr-only">Close panel</span>
                                                        <XIcon className="h-6 w-6" aria-hidden="true"/>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                        <hr className="border-gray-200"/>

                                        <div
                                            className="py-6 space-y-6 sm:py-0 sm:space-y-0 bg-gray-50">

                                            <div
                                                className="space-y-1 px-4 sm:space-y-0 grid grid-cols-2 sm:gap-4 sm:px-6 sm:py-5">
                                                <div>
                                                    <label
                                                        htmlFor="project-name"
                                                        className="block text-gray-900 sm:mt-px sm:pt-2"
                                                    >
                                                        Name
                                                    </label>
                                                </div>
                                                <div className="mt-1 relative col-span-2">
                                                    <input
                                                        type="text"
                                                        name="new-setup-key-name"
                                                        id="new-setup-key-name"
                                                        className="w-full shadow-sm text-lg focus:ring-gray-300 rounded focus:border-gray-300 border border-gray-300"
                                                        value={keyName}
                                                        onChange={event => setKeyName(event.target.value)}
                                                    />
                                                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                                                        <ExclamationCircleIcon id="name-validation-error-icon" className="h-5 w-5 text-red-400 hidden" aria-hidden="true" />
                                                    </div>
                                                </div>
                                                <div className="sm:col-span-2">
                                                    <p id="name-validation-error" className="mt-2 text-sm text-red-600 hidden">
                                                        The name of the key can't be empty.
                                                    </p>
                                                </div>

                                            </div>

                                            <fieldset>
                                                <div
                                                    className="space-y-2 px-4 sm:space-y-0 grid sm:grid-cols-2 sm:gap-4 sm:items-start sm:px-6 sm:py-5">
                                                    <div>
                                                        <legend
                                                            className="text-gray-900">Type
                                                        </legend>
                                                    </div>
                                                    <div className="space-y-5 sm:col-span-2">
                                                        <RadioGroup value={selectedType} onChange={setSelectedType}>
                                                            <RadioGroup.Label className="sr-only">Privacy
                                                                setting</RadioGroup.Label>
                                                            <div className="bg-white rounded -space-y-px">
                                                                {types.map((setting, settingIdx) => (
                                                                    <RadioGroup.Option
                                                                        key={setting.name}
                                                                        value={setting}
                                                                        className={({checked}) =>
                                                                            classNames(
                                                                                settingIdx === 0 ? 'rounded-tl-md rounded-tr-md' : '',
                                                                                settingIdx === types.length - 1 ? 'rounded-bl-md rounded-br-md' : '',
                                                                                checked ? 'bg-gray-50 border-gray-200 z-10' : 'border-gray-200',
                                                                                'relative border p-4 flex cursor-pointer focus:outline-none'
                                                                            )
                                                                        }
                                                                    >
                                                                        {({active, checked}) => (
                                                                            <>
                                                                                <span
                                                                                    className={classNames(
                                                                                        checked ? 'bg-gray-600 border-transparent' : 'bg-white border-gray-300',
                                                                                        active ? 'ring-2 ring-offset-2 ring-gray-500' : '',
                                                                                        'h-4 w-4 mt-0.5 cursor-pointer rounded border flex items-center justify-center'
                                                                                    )}
                                                                                    aria-hidden="true"
                                                                                >
                                                                                  <span
                                                                                      className="rounded bg-white w-1.5 h-1.5"/>
                                                                                </span>
                                                                                <div className="ml-3 flex flex-col">
                                                                                    <RadioGroup.Label
                                                                                        as="span"
                                                                                        className={classNames(checked ? 'text-gray-900' : 'text-gray-900', 'block text-sm')}
                                                                                    >
                                                                                        {setting.name}
                                                                                    </RadioGroup.Label>
                                                                                    <RadioGroup.Description
                                                                                        as="span"
                                                                                        className={classNames(checked ? 'text-gray-700' : 'text-gray-500', 'block text-sm')}
                                                                                    >
                                                                                        {setting.description}
                                                                                    </RadioGroup.Description>
                                                                                </div>
                                                                            </>
                                                                        )}
                                                                    </RadioGroup.Option>
                                                                ))}
                                                            </div>
                                                        </RadioGroup>
                                                        <hr className="border-gray-200"/>
                                                        <div
                                                            className="flex flex-col space-between space-y-4 sm:flex-row sm:items-center sm:space-between sm:space-y-0">
                                                            <div>
                                                                <a
                                                                    href="https://docs.netbird.io/overview/setup-keys"
                                                                    target="_blank"
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
                                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-white px-4 py-2 text-sm font-medium text-gray-500 shadow-sm ring-1 ring-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                                                onClick={() => {
                                                    closeCallback(true, null, null, null)
                                                }}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                                                onClick={() => {
                                                    if (!keyName) {
                                                        let el = document.getElementById("name-validation-error");
                                                        el.classList.remove("hidden")
                                                        el = document.getElementById("name-validation-error-icon");
                                                        el.classList.remove("hidden")
                                                    } else {
                                                        closeCallback(false, keyName, selectedType.value, null)
                                                    }
                                                }}
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