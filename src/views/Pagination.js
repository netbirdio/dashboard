import React, { useEffect, useState } from "react";
import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import Loading from "../components/Loading";
import { deletePeer, getPeers } from "../api/ManagementAPI";
import { timeAgo } from "../utils/common";
import EditButton from "../components/EditButton";
import CopyText from "../components/CopyText";
import DeleteModal from "../components/DeleteDialog";
import EmptyPeersPanel from "../components/EmptyPeers";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";

// @data the data that will be paginated : In this case will be Peerslist
// @RenderComponent the component that needs to be rendered : In this case will be PeerRow
// @pageLimit maximum Elements rendered per page
// @dataLimit
const PeersList = (props) => {
	const [pageCount] = useState(
		Math.ceil(props.data.length / props.dataLimit)
	);

	const [currentPage, setCurrentPage] = useState(1);

	function goToNextPage() {
		setCurrentPage((page) => {
			return page === pageCount ? page : page + 1;
		});
	}

	function goToPreviousPage() {
		setCurrentPage((page) => {
			return page === 1 ? page : page - 1;
		});
	}

	function changePage(event) {
		const pageNumber = Number(event.target.textContent);
		setCurrentPage(pageNumber);
	}

	const getPaginatedData = () => {
		const startIndex = currentPage * props.dataLimit - props.dataLimit;
		const endIndex = startIndex + props.dataLimit;
		return props.data.slice(startIndex, endIndex);
	};

	const getPaginationGroup = () => {
		let start =
			Math.floor((currentPage - 1) / props.pageLimit) * props.pageLimit;
		return new Array(props.pageLimit)
			.fill()
			.map((_, idx) => start + idx + 1);
	};

	function PaginationBarElem(props) {
        let default_btn = "z-10 bg-white squared-md border-gray-300 text-gray-700 relative inline-flex items-center px-4 py-2 border text-sm font-medium";
        let clicked_btn = "z-10 bg-indigo-50 border-indigo-500 text-indigo-600 relative inline-flex items-center px-4 py-2 border text-sm font-medium";

		return (
			<a
				aria-current="page"
				href="#"
				className={props.pageNo === props.clicked ? clicked_btn : default_btn}
				onClick={changePage}
			>
				{props.pageNo}
			</a>
		);
	}

	return (
		<>
			<div className="flex flex-col">
				<div className="-my-2 sm:-mx-6 lg:-mx-8">
					<div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
						<div className="shadow border-b border-gray-200 sm:rounded-lg">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-100">
									<tr>
										{[
											"Name",
											"IP",
											"Status",
											"Last Seen",
											"OS",
											"Version",
										].map((col) => {
											return (
												<th
													scope="col"
													className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
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
									{getPaginatedData().map((elem) =>
										props.RenderComponent(elem)
									)}
								</tbody>
							</table>
						</div>
					</div>
				</div>
			</div>
			<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
				<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
					<div>
						<p className="text-sm text-gray-700">
							Showing{" "}
							<span className="font-medium">{currentPage}</span>{" "}
							to <span className="font-medium">{pageCount}</span>{" "}
							of <span className="font-medium">{pageCount}</span>
						</p>
					</div>
					<div>
						<nav
							className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
							aria-label="Pagination"
						>
							<a
								href="#"
								className="relative inline-flex items-center px-2 py-2 squared-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
							>
								<span className="sr-only">Previous</span>
								<ChevronLeftIcon
									className="h-5 w-5"
									aria-hidden="true"
									onClick={goToPreviousPage}
								/>
							</a>
							<div>
								{/* Current: "z-10 bg-indigo-50 border-indigo-500 text-indigo-600", Default: "bg-white border-gray-300 text-gray-500 hover:bg-gray-50" */}
								{[...Array(pageCount)].map((_, idx) => {
									return (
										<PaginationBarElem
                                            clicked={currentPage}
											pageNo={idx + 1}
											key={idx + 1}
										/>
									);
								})}
							</div>
							<a
								href="#"
								className="relative inline-flex items-center px-2 py-2 squared-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50"
							>
								<span className="sr-only">Next</span>
								<ChevronRightIcon
									className="h-5 w-5"
									aria-hidden="true"
									onClick={goToNextPage}
								/>
							</a>
						</nav>
					</div>
				</div>
			</div>
		</>
	);
};

// What do we need to implement this feature?
// We need to refactor in such a way that we can render the PeerRow Seperately
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
				<td className="px-6 py-4 whitespace-nowrap text-sm font-medium font-semibold font-mono text-gray-900">
					{peer.Name}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm font-medium font-mono text-gray-900">
					<CopyText
						text={peer.IP.toUpperCase()}
						idPrefix={"peers-ip-" + peer.IP}
					/>
				</td>
				<td className="px-6 py-4 whitespace-nowrap">
					{peer.Connected && (
						<span className="px-2 inline-flex text-sm leading-5 font-mono squared-full bg-green-100 text-green-800">
							Online
						</span>
					)}
					{!peer.Connected && (
						<span className="px-2 inline-flex text-sm leading-5 font-mono squared-full bg-red-100 text-red-800">
							Offline
						</span>
					)}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
					{peer.ConnectedP ? "just now" : timeAgo(peer.LastSeen)}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
					{peer.OS}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-700">
					{peer.Version}
				</td>
				<td className="px-6 py-4 whitespace-nowrap text-right  text-m font-medium">
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
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<h1 className="text-2xl font-mono leading-tight text-gray-900 font-bold">
							Peers
						</h1>
					</div>
				</header>
				<main>
					<div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
						<div className="px-4 py-8 sm:px-0">
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
											<PeersList
												data={peers}
												RenderComponent={PeerRow}
												dataLimit={1}
												pageLimit={8}
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
