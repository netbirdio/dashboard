import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {formatDate, timeAgo} from "../utils/common";
import {createSetupKey, getSetupKeys, revokeSetupKey} from "../api/ManagementAPI";
import EditButton from "../components/EditButton";
import CopyText from "../components/CopyText";
import DeleteModal from "../components/DeleteDialog";
import NewSetupKeyDialog from "../components/NewSetupKeyDialog";


export const SetupKeysComponent = () => {

        const [setupKeys, setSetupKeys] = useState([])
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)
        const [showDeleteDialog, setShowDeleteDialog] = useState(false)
        const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
        const [deleteDialogText, setDeleteDialogText] = useState("")
        const [deleteDialogTitle, setDeleteDialogTitle] = useState("")
        const [keyToRevoke, setKeyToRevoke] = useState(null)

        const handleNewKeyClick = () => {
            setShowNewKeyDialog(true)
        }

        const newSetupKeyDialogCallback = (cancelled, name, type, expiresIn) => {
            if (!cancelled) {
                createSetupKey(getAccessTokenSilently, name, type, expiresIn)
                    .then(() => refresh())
                    .catch(error => {
                        console.log(error)
                    })
            }
            setShowNewKeyDialog(false)
        }

        const {
            getAccessTokenSilently,
        } = useAuth0();

        const handleError = error => {
            console.error('Error to fetch data:', error);
            setLoading(false)
            setError(error);
        };

        //called when user clicks on table row menu item
        const handleRowMenuClick = (action, key) => {
            if (action === 'Revoke') {
                setKeyToRevoke(key)
                setDeleteDialogText("Are you sure you want to revoke setup key?")
                setDeleteDialogTitle("Revoke key \"" + key.Name + "\"")
                setShowDeleteDialog(true)
            }
        };

        // after user confirms (or not) revoking the key
        const handleRevokeConfirmation = (confirmed) => {
            setShowDeleteDialog(false)
            if (confirmed && !keyToRevoke.Revoked) {
                revokeSetupKey(getAccessTokenSilently, keyToRevoke.Id)
                    .then(() => setKeyToRevoke(null))
                    .then(() => refresh())
                    .catch(error => {
                        setKeyToRevoke(null)
                        console.log(error)
                    })
            } else {
                setKeyToRevoke(null)
            }
        }

        const refresh = () => {
            getSetupKeys(getAccessTokenSilently)
                .then(responseData => responseData.sort((a, b) => (a.Name > b.Name) ? 1 : -1))
                .then(sorted => setSetupKeys(sorted))
                .then(() => setLoading(false))
                .catch(error => handleError(error))
        }

        useEffect(() => {
            refresh()
        }, [getAccessTokenSilently])

        return (
            <>
                <div className="py-10 bg-gray-50 overflow-hidden rounded max-w-7xl mx-auto sm:px-6 lg:px-8">
                    <header className="sm:flex sm:items-center">
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:flex-auto">
                            <h1 className="text-xl font-semibold text-gray-900">Setup Keys</h1>
                            <p className="mt-2 text-sm text-gray-700">
                                A list of all the setup keys in your account including their name, state, type and
                                expiration.
                            </p>
                        </div>
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:flex-auto mt-2 sm:mt-0 sm:ml-16 sm:flex-none">


                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                                onClick={() => {
                                    handleNewKeyClick()
                                }}
                            >
                                Add Key
                            </button>
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
                                    <DeleteModal show={showDeleteDialog}
                                                 confirmCallback={handleRevokeConfirmation}
                                                 text={deleteDialogText} title={deleteDialogTitle}/>
                                    <NewSetupKeyDialog show={showNewKeyDialog} closeCallback={newSetupKeyDialogCallback}/>

                                    <div className="flex flex-col">
                                        <div className="-my-2 sm:-mx-6 lg:-mx-8">
                                            <div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                                                <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                                    <table className="min-w-full divide-y divide-gray-200">
                                                        <thead className="bg-gray-50">
                                                        <tr>
                                                            {[
                                                                "Name",
                                                                "State",
                                                                "Type",
                                                                "Key",
                                                                "Last Used",
                                                                "Used Times",
                                                                "Expires",
                                                            ].map((col) => {
                                                                return (
                                                                    <th
                                                                        scope="col"
                                                                        className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                                                                        key={col}
                                                                    >
                                                                        {col}
                                                                    </th>
                                                                );
                                                            })}
                                                            <th
                                                                scope="col"
                                                                className="relative px-6 py-3"
                                                            >
                                                                <span className="sr-only">
                                                                    Edit
                                                                </span>
                                                            </th>
                                                        </tr>
                                                        </thead>
                                                        <tbody className="bg-white divide-y divide-gray-200">
                                                        {setupKeys.map((setupKey, idx) => (
                                                            <tr key={setupKey.Id}>
                                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{setupKey.Name}</td>
                                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                                                                    {setupKey.Valid && (
                                                                        <span className="inline-flex rounded-full bg-green-100 px-2 text-xs leading-5 text-green-800">
                                                                        valid
                                                                    </span>
                                                                    )}
                                                                    {!setupKey.Valid && (
                                                                        <span className="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 text-red-800">
                                                                         {setupKey.State}
                                                                    </span>
                                                                    )}
                                                                </td>

                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{setupKey.Type.toLowerCase()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">

                                                                    <CopyText text={setupKey.Key.toUpperCase()}
                                                                              idPrefix={"setup-keys" + setupKey.Id}/>

                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{setupKey.UsedTimes === 0 ? "unused" : timeAgo(setupKey.LastUsed)}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{setupKey.UsedTimes}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{formatDate(setupKey.Expires)}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-m">
                                                                    <EditButton items={[{name: "Revoke"}]}
                                                                                handler={action => handleRowMenuClick(action, setupKey)}/>
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
