import LinuxTab from "./LinuxTab";
import {useState} from "react";
import {classNames} from "../../utils/common";
import WindowsTab from "./WindowsTab";
import MacTab from "./MacTab";

const tabs = [
    {name: 'Linux', idx: 1},
    {name: 'Windows', idx: 2},
    {name: 'MacOS', idx: 3}
]

const AddPeerTabSelector = ({setupKey}) => {

    const [openTab, setOpenTab] = useState(1);

    return (
        <div>
            <div className="hidden sm:block">
                <div className="border-b border-gray-200">
                    <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => (
                            <button
                                key={tab.name}
                                onClick={e => {
                                    e.preventDefault();
                                    setOpenTab(tab.idx)
                                }}
                                className={classNames(
                                    tab.idx === openTab
                                        ? 'border-indigo-500 text-gray-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300',
                                    'whitespace-nowrap py-4 px-1 border-b-2 text-sm'
                                )}
                                aria-current={tab.idx === openTab ? 'page' : undefined}
                            >
                                {tab.name}
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
            <div className="w-full mx-auto sm:px-6 lg:px-8">
                <div className="px-4 py-8 sm:px-0">
                    <div className={openTab === 1 ? "block" : "hidden"} id="linux-installation-steps">
                        <LinuxTab setupKey={setupKey}/>
                    </div>
                    <div className={openTab === 2 ? "block" : "hidden"} id="windows-installation-steps">
                        {/*<WindowsTab setupKey={setupKey}/>*/}
                    </div>
                    <div className={openTab === 3 ? "block" : "hidden"} id="macos-installation-steps">
                        <MacTab setupKey={setupKey}/>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default AddPeerTabSelector;