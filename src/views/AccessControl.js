import React, {useState} from "react";
import {withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {Link} from "react-router-dom";


export const AccessControlComponent = () => {

    const [sortItemOption, setSortItemOption] = useState(0);
    const [error] = useState(null)
    const [loading] = useState(true)

    const sortItemOptions = [
        {value: 0, title : "Name: Asc"},
        {value: 1, title : "Name: Desc"},
        {value: 2, title : "Last Seen: Asc"},
        {value: 3, title : "Last Seen: Desc"},
    ]

    const handleSearch = (e) => {}
    const sortTable = (e) => {
        setSortItemOption(e.target.value)
    }
    const showAll = () => {}
    const showEnabled = () => {}

    return (
        <>
            <div className="py-10 px-4">
                <header>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        <h1 className="text-xl font-semibold text-gray-900">Access Control</h1>
                    </div>
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                        {error != null && (
                            <span>{error.toString()}</span>
                        )}

                        <p className="text-sm pt-2 text-gray-700">Create and control access group</p>
                        <p className="text-sm pt-2 text-gray-700">
                            Here you will be able to specify what peers or groups of peers are able to connect to
                            each other.
                            For example, you might have 3 departments in your organization - IT, HR, Finance.
                            In most cases Finance and HR departments wouldn't need to access machines of the IT
                            department.
                            In such scenario you could create 3 separate tags (groups) and label peers accordingly
                            so that only
                            peers
                            from the same group can access each other.
                            You could also specify what groups can connect to each other and do fine grained control
                            even on a
                            peer level.
                        </p>
                    </div>
                </header>
                <main>
                    <div className="max-w-7xl mx-auto my-8 sm:px-6 lg:px-8">
                        {error != null && <span>{error.toString()}</span>}
                        <div className="auto">
                            <div className="grid grid-cols-1 md:grid-cols-1 lg:grid-cols-6 gap-5">
                                <div className="lg:col-span-2">
                                    <input
                                        className="text-sm w-full rounded p-2 border border-gray-300 focus:border-gray-400 outline-none"
                                        placeholder="Search..."
                                        type="search"
                                        onChange={(e) => handleSearch(e.target.value)}
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <div className="flex items-center">
                                        <p className="ml-0 text-sm text-gray-700 lg:px-4 md:pr-2 pr-2">Sort by: &nbsp;</p>
                                        <select
                                            className="bg-gray-50 flex-1 lg:flex-grow-0 text-sm text-gray-500 rounded p-2 border border-gray-300 focus:border-gray-400 outline-none"
                                            value={sortItemOption}
                                            onChange={sortTable}
                                        >
                                            {sortItemOptions.map(si => <option className="text-sm text-gray-500" key={si.value} value={si.value}>{si.title}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="flex lg:justify-end justify-center">
                                    <div className="flex items-center">
                                        <span className="relative z-0 inline-flex shadow-sm rounded-md">
                                            <button
                                                id="btn-show-all"
                                                onClick={() => showAll()}
                                                type="button"
                                                className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 z-10 outline-none ring-1 ring-indigo-500 border-indigo-500"
                                            >
                                              All
                                            </button>
                                            <button
                                                type="button"
                                                id="btn-show-enabled"
                                                active={true}
                                                onClick={() => showEnabled()}
                                                className="relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 outline-none hover:bg-gray-50"
                                            >
                                              Enabled
                                            </button>
                                        </span>
                                    </div>
                                </div>

                                <div className="lg:flex lg:justify-end">
                                    <Link to="/add-rule">
                                        <button
                                            type="button"
                                            className="inline-flex w-full lg:w-auto justify-center items-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                                        >
                                            New rule
                                        </button>
                                    </Link>
                                </div>

                            </div>
                        </div>
                    </div>
                </main>
            </div>
        </>
    );
};

export default withAuthenticationRequired(AccessControlComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
