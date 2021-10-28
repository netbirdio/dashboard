import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {formatDate, timeAgo} from "../utils/common";
import {createSetupKey, getSetupKeys, revokeSetupKey} from "../api/ManagementAPI";
import EditButton from "../components/EditButton";
import CopyText from "../components/CopyText";
import DeleteModal from "../components/DeleteDialog";
import {PlusSmIcon as PlusSmIconSolid} from "@heroicons/react/solid";
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
                                    <DeleteModal show={showDeleteDialog}
                                                 confirmCallback={handleRevokeConfirmation}
                                                 text={deleteDialogText} title={deleteDialogTitle}/>
                                    <NewSetupKeyDialog show={showNewKeyDialog} closeCallback={newSetupKeyDialogCallback}/>
                                    <div className="py-3 text-right">

                                        <button
                                            type="button"
                                            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-mono squared-md text-white bg-gray-500 hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
                                            onClick={() => {
                                                handleNewKeyClick()
                                            }}
                                        >
                                            <PlusSmIconSolid className="h-5 w-5" aria-hidden="true"/>
                                            New Key
                                        </button>
                                    </div>
                                    <div className="flex flex-col">
                                        <div className="-my-2 sm:-mx-6 lg:-mx-8">
                                            <div
                                                className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
                                                <div
                                                    className="shadow  border-b border-gray-200 sm:rounded-lg">
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
                                                                State
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
                                                                     valid
                                                                  </span>
                                                                    )}
                                                                    {!setupKey.Valid && (
                                                                        <span
                                                                            className="px-2 inline-flex text-sm leading-5 font-mono squared-full bg-red-100 text-red-800">
                                                                     {setupKey.State}
                                                                  </span>
                                                                    )}
                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{setupKey.Type.toLowerCase()}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">

                                                                    <CopyText text={setupKey.Key.toUpperCase()}
                                                                              idPrefix={"setup-keys" + setupKey.Id}/>

                                                                </td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{setupKey.UsedTimes === 0 ? "unused" : timeAgo(setupKey.LastUsed)}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{setupKey.UsedTimes}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">{formatDate(setupKey.Expires)}</td>
                                                                <td className="px-6 py-4 whitespace-nowrap text-right text-m font-medium">
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
