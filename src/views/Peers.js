import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {deletePeer, getPeers} from "../api/ManagementAPI";
import {timeAgo} from "../utils/common";
import EditButton from "../components/EditButton";
import CopyText from "../components/CopyText";
import DeleteModal from "../components/DeleteDialog";
import EmptyPeersPanel from "../components/EmptyPeers";
import PaginatedPeersList from "../components/PaginatedPeersList"
import {Link} from "react-router-dom";
import {PlusSmIcon as PlusSmIconSolid} from "@heroicons/react/solid";

export const Peers = () => {
    const [peers, setPeers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);
    const [peerToDelete, setPeerToDelete] = useState(null);
    const [deleteDialogText, setDeleteDialogText] = useState("");
    const [deleteDialogTitle, setDeleteDialogTitle] = useState("");

    const {getAccessTokenSilently} = useAuth0();

    const handleError = (error) => {
        console.error("Error to fetch data:", error);
        setLoading(false);
        setError(error);
    };

    const formatOS = (os) => {
        if (os.startsWith("windows 10")) {
            return "Windows 10"
        }

        if (os.startsWith("Darwin")) {
            return os.replace("Darwin", "MacOS")
        }

        return os
    }

    //called when user clicks on table row menu item
    const handleRowMenuClick = (action, peer) => {
        if (action === "Delete") {
            setPeerToDelete(peer);
            setDeleteDialogText(
                "Are you sure you want to delete peer from your account?"
            );
            setDeleteDialogTitle('Delete peer "' + peer.Name + '"');
            setShowDeleteDialog(true);
        }
    };

    const refresh = () => {
        getPeers(getAccessTokenSilently)
            .then((responseData) =>
                responseData.sort((a, b) => (a.Name > b.Name ? 1 : -1))
            )
            .then((sorted) => setPeers(sorted))
            .then(() => setLoading(false))
            .catch((error) => handleError(error));
    };

    // after user confirms (or not) deletion of the peer
    const handleDeleteConfirmation = (confirmed) => {
        setShowDeleteDialog(false);
        if (confirmed) {
            deletePeer(getAccessTokenSilently, peerToDelete.IP)
                .then(() => setPeerToDelete(null))
                .then(() => refresh())
                .catch((error) => {
                    setPeerToDelete(null);
                    console.log(error);
                });
        } else {
            setPeerToDelete(null);
        }
    };

    useEffect(() => {
        refresh();
    }, [getAccessTokenSilently]);

    const PeerRow = (peer) => {
        return (
            <tr key={peer.IP}>
                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">
                    {peer.Name}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <CopyText
                        text={peer.IP.toUpperCase()}
                        idPrefix={"peers-ip-" + peer.IP}
                    />
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {peer.Connected && (
                        <span className="inline-flex rounded-full bg-green-100 px-2 text-xs leading-5 text-green-800">
							online
						</span>
                    )}
                    {!peer.Connected && (
                        <span className="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 text-red-800">
							offline
						</span>
                    )}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {peer.Connected ? "just now" : timeAgo(peer.LastSeen)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {formatOS(peer.OS)}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    {peer.Version}
                </td>
                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">
                    <EditButton
                        items={[{name: "Delete"}]}
                        handler={(action) => handleRowMenuClick(action, peer)}
                    />
                </td>
            </tr>
        );
    };

    return (
        <div className="py-10 bg-gray-50 overflow-hidden rounded max-w-7xl mx-auto sm:px-6 lg:px-8">
            <header className="sm:flex sm:items-center">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Peers</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        A list of all the machines in your account including their name, IP and status.
                    </p>
                </div>
                {/*{peers.length !== 0 ? (
                    <span className="relative z-0 inline-flex shadow-sm rounded-md">
                  <button
                      type="button"
                      className="relative inline-flex items-center px-4 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 z-10 outline-none ring-1 ring-indigo-500 border-indigo-500"
                  >
                    All
                  </button>
                  <button
                      type="button"
                      className="-ml-px relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:z-10 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    Online
                  </button>
                </span>
                ) : (<div/>)}
*/}
                {peers.length !== 0 ? (
                    <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:flex-auto mt-2 sm:mt-0 sm:ml-16 sm:flex-none">
                        <Link to="/add-peer">
                            <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                            >
                                Add peer
                            </button>
                        </Link>
                    </div>) : (<div/>)}
            </header>
            <main>
                <div className="max-w-7xl mx-auto">
                    <div className="px-4 sm:px-0">
                        {loading && <Loading/>}
                        {error != null && <span>{error.toString()}</span>}
                        <main>
                            {loading && <Loading/>}
                            {error != null && (
                                <span>{error.toString()}</span>
                            )}

                            {peers.length === 0 ? (
                                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-10">
                                    <EmptyPeersPanel/>
                                </div>

                            ) : (
                                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                    <div className="px-4 py-8 sm:px-0">
                                        <DeleteModal
                                            show={showDeleteDialog}
                                            confirmCallback={
                                                handleDeleteConfirmation
                                            }
                                            text={deleteDialogText}
                                            title={deleteDialogTitle}
                                        />
                                        <PaginatedPeersList
                                            data={peers}
                                            RenderComponent={PeerRow}
                                            dataLimit={5}
                                            pageLimit={5}
                                        />
                                    </div>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </main>
        </div>

    );
};
export default withAuthenticationRequired(Peers, {
    onRedirecting: () => <Loading/>,
});
