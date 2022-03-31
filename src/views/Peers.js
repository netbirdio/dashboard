import React, { useEffect, useState } from "react";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import Loading from "../components/Loading";
import { deletePeer, getPeers } from "../api/ManagementAPI";
import { timeAgo } from "../utils/common";
import EditButton from "../components/EditButton";
import CopyText from "../components/CopyText";
import DeleteModal from "../components/DeleteDialog";
import EmptyPeersPanel from "../components/EmptyPeers";
import PaginatedPeersList from "../components/PaginatedPeersList"

export const Peers = () => {
	const [peers, setPeers] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);
	const [showDeleteDialog, setShowDeleteDialog] = useState(false);
	const [peerToDelete, setPeerToDelete] = useState(null);
	const [deleteDialogText, setDeleteDialogText] = useState("");
	const [deleteDialogTitle, setDeleteDialogTitle] = useState("");

	const { getAccessTokenSilently } = useAuth0();

	const handleError = (error) => {
		console.error("Error to fetch data:", error);
		setLoading(false);
		setError(error);
	};

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
				<td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
					{peer.Name}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
					<CopyText
						text={peer.IP.toUpperCase()}
						idPrefix={"peers-ip-" + peer.IP}
					/>
				</td>
				<td className="px-6 py-4 whitespace-nowrap">
					{peer.Connected && (
						<span className="px-2 inline-flex text-sm leading-5 squared-full bg-green-100 text-green-800">
							Online
						</span>
					)}
					{!peer.Connected && (
						<span className="px-2 inline-flex text-sm leading-5 squared-full bg-red-100 text-red-800">
							Offline
						</span>
					)}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
					{peer.ConnectedP ? "just now" : timeAgo(peer.LastSeen)}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
					{peer.OS}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
					{peer.Version}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-right text-m font-medium">
					<EditButton
						items={[{ name: "Delete" }]}
						handler={(action) => handleRowMenuClick(action, peer)}
					/>
				</td>
			</tr>
		);
	};

	return (
		<>
			<div className="py-10">
				<header>
					<div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
						<h1 className="text-2xl leading-tight text-gray-900 font-normal">
							Peers
						</h1>
						<p className="mt-2 text-sm text-gray-700">
							A list of all the machines in your account including their name, IP and status.
						</p>
					</div>
				</header>
				<main>
					<div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
						<div className="px-4 sm:px-0">
							{loading && <Loading />}
							{error != null && <span>{error.toString()}</span>}
							<main>
								{loading && <Loading />}
								{error != null && (
									<span>{error.toString()}</span>
								)}

								{peers.length === 0 ? (
									<EmptyPeersPanel />
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
		</>
	);
};
export default withAuthenticationRequired(Peers, {
	onRedirecting: () => <Loading />,
});
