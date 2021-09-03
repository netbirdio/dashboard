import {Fragment, useState} from 'react'
import {Listbox, Transition} from '@headlessui/react'
import {CheckIcon, SelectorIcon} from '@heroicons/react/solid'
import CopyButton from "../CopyButton";
import {classNames} from "../../utils/common";
import PropTypes from "prop-types";

const SetupKeySelect = ({data, onSelected}) => {
    const [selected, setSelected] = useState(data.length > 0 ? data[0] : {Name: "...", Id: "none"})

    const handleSelected = selectedKey => {
        setSelected(selectedKey)
        onSelected(selectedKey)
        let keyBox = document.getElementById("key-box");
        keyBox.classList.remove("hidden")
    };

    return (
        <div>
            <span className="text-m tracking-wide font-mono text-gray-700">Select setup key to register peer:</span>
            <span className="ml-4 min-w-0">
                <div className="flex flex-col space-y-2">
            <Listbox value={selected} onChange={handleSelected}>
                {({open}) => (
                    <>
                        <div className="mt-1 relative">
                            <Listbox.Button
                                className="bg-white relative w-full border border-gray-300 squared-md shadow-sm pl-3 pr-10 py-2 text-left cursor-default focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                                <span className="block truncate font-mono">{selected.Name}</span>
                                <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <SelectorIcon className="h-5 w-5 text-gray-400" aria-hidden="true"/>
              </span>
                            </Listbox.Button>

                            <Transition
                                show={open}
                                as={Fragment}
                                leave="transition ease-in duration-100"
                                leaveFrom="opacity-100"
                                leaveTo="opacity-0"
                            >
                                <Listbox.Options
                                    className="absolute z-10 mt-1 w-full bg-white shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                                    {data.map((item) => (
                                        <Listbox.Option
                                            key={item.Id}
                                            className={({active}) =>
                                                classNames(
                                                    active ? 'text-white bg-indigo-600' : 'text-gray-900',
                                                    'cursor-default select-none relative py-2 pl-3 pr-9'
                                                )
                                            }
                                            value={item}
                                        >
                                            {({selected, active}) => (
                                                <>
                        <span className={classNames(selected ? 'font-semibold' : 'font-mono', 'block truncate')}>
                          {item.Name}
                        </span>

                                                    {selected ? (
                                                        <span
                                                            className={classNames(
                                                                active ? 'text-white' : 'text-indigo-600',
                                                                'absolute inset-y-0 right-0 flex items-center pr-4'
                                                            )}
                                                        >
                            <CheckIcon className="h-5 w-5" aria-hidden="true"/>
                          </span>
                                                    ) : null}
                                                </>
                                            )}
                                        </Listbox.Option>
                                    ))}
                                </Listbox.Options>
                            </Transition>
                        </div>
                    </>
                )}
            </Listbox>
            <div id="key-box" className="hidden rounded-md bg-gray-100 p-4">
                <div className="ml-3 flex-1 md:flex md:justify-between">
                    <p className="text-sm font-mono text-gray-700">{selected.Key}</p>
                    <p className="mt-4 text-sm md:mt-0 md:ml-6">
                        <CopyButton toCopy={selected.Key}/>
                    </p>
                </div>
            </div>
        </div>
            </span>
        </div>

    )
}

SetupKeySelect.propTypes = {
    data: PropTypes.array,
    onSelected: PropTypes.func,
};

SetupKeySelect.defaultProps = {};

export default SetupKeySelect
