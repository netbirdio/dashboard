import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {formatDate} from "../utils/common";
import {getSetupKeys} from "../api/ManagementAPI";


export const SetupKeysComponent = () => {

        const [setupKeys, setSetupKeys] = useState([])
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)

        const {
            getAccessTokenSilently,
        } = useAuth0();

        const handleError = error => {
            console.error('Error to fetch data:', error);
            setLoading(false)
            setError(error);
        };

        useEffect(() => {
            getSetupKeys(getAccessTokenSilently)
                .then(responseData => responseData.sort((a, b) => (a.Name > b.Name) ? 1 : -1))
                .then(sorted => setSetupKeys(sorted))
                .then(() => setLoading(false))
                .catch(error => handleError(error))
        }, [getAccessTokenSilently])

        return (
            <>
                <div className="py-10">
                    <header>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-2xl font-mono leading-tight text-gray-900 font-bold">Setup Keys</h1>
                        </div>
                    </header>
                    <main>
                        {loading && (<Loading/>)}
                        {error != null && (
                            <span>{error.toString()}</span>
                        )}
                        {setupKeys && (
                            <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                <div className="px-4 py-8 sm:px-0">
                                    <div className="flex flex-col">
                                        <div className="-my-2 overflow-x-auto sm:-mx-6 lg:-mx-8">
                                            <div
                                                className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                                                <div
                                                    className="shadow overflow-hidden border-b border-gray-200 sm:rounded-lg">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-100">
                                                        <tr>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Name
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Valid
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Type
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Key
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Last Used
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Used Times
                                                            </th>
                                                            <th
                                                                scope="col"
                                                                className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                                                            >
                                                                Expires
                                                            </th>
                                                            <th scope="col" className="relative px-6 py-3">
                                                                <span className="sr-only">Edit</span>
                                                            </th>
                                                        </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                        {setupKeys.map((setupKey, idx) => (
                                                            <tr key={setupKey.Id}>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium font-semibold font-mono text-gray-900">{setupKey.Name}</td>

                                                                <td className="px-6 py-4 whitespace-nowrap">
                                                                    {setupKey.Valid && (
                                                                        <span
                                                                            className="px-2 inline-flex text-sm leading-5 font-mono squared-full bg-green-100 text-green-800">
                                                                     Yes
                                                                  </span>
                                                                    )}
                                                                    {!setupKey.Valid && (
                                                                        <span
                                                                            className="px-2 inline-flex text-sm leading-5 font-mono squared-full bg-red-100 text-red-800">
                                                                     No
                                                                  </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{setupKey.Type.toLowerCase()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{setupKey.Key.toUpperCase()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{formatDate(setupKey.LastUsed)}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{setupKey.UsedTimes}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{formatDate(setupKey.Expires)}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right  text-m font-medium">
                                                                    <a href="/#"
                                                                       className="text-indigo-600 hover:text-indigo-900">
                                                                        Edit
                                                                    </a>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                        </tbody>
                                                    </table>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </>
        );
    }
;

export default withAuthenticationRequired(SetupKeysComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
