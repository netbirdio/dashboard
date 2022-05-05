import { useAuth0, withAuthenticationRequired } from "@auth0/auth0-react";
import React, { useEffect, useState } from "react";
import { usePagination, useTable } from "react-table";
import { getUsers } from "../api/ManagementAPI";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import EmptyPeersPanel from "../components/EmptyPeers";
import Loading from "../components/Loading";

export const Users = () => {
	const [users, setUsers] = useState([]);
	const [usersBackup, setUsersBackup] = useState([]);
	const [empty, setEmpty] = useState(true);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	const { getAccessTokenSilently } = useAuth0();

	const handleError = (error) => {
		console.error("Error to fetch data:", error);
		setLoading(false);
		setError(error);
	};
	// Add React Table
	const data = React.useMemo(() => users, [users]);

	const columns = React.useMemo(
		() => [
			{
				Header: "Email",
				accessor: "email",
			},
			{
				Header: "Name",
				accessor: "name",
			},
			{
				Header: "Role",
				accessor: "role",
			},
		],
		[]
	);
	const td_class_email =
		"whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6";
	const td_class_other = "whitespace-nowrap px-3 py-4 text-sm text-gray-500";

	const {
		getTableProps,
		getTableBodyProps,
		headerGroups,
		prepareRow,
		page,
		canPreviousPage,
		canNextPage,
		pageCount,
		gotoPage,
		nextPage,
		previousPage,
		state: { pageIndex, pageSize },
	} = useTable(
		{ columns, data, initialState: { pageIndex: 0, pageSize: 10 } },
		usePagination
	);

	const handleSearch = (e) => {
		let tempArray = usersBackup.filter((item) =>
			item.email.toUpperCase().includes(e.toUpperCase()) || item.name.toUpperCase().includes(e.toUpperCase())
		);
		setUsers(tempArray);
	};

	const sortTable = (e) => {
		let userCopy = [...users];
		if (e === "0") {
			userCopy.sort((a, b) => (a.email > b.email ? 1 : -1));
		} else if (e === "1") {
			userCopy.sort((a, b) => (a.email > b.email ? -1 : 1));
		} else if (e === "2") {
			userCopy.sort((a, b) => (a.name > b.name ? 1 : -1));
		} else if (e === "3") {
			userCopy.sort((a, b) => (a.name > b.name ? -1 : 1));
		} else {
			console.log(`Sorry, we are out of ${e}`, e);
		}
		setUsers(userCopy);
	};

	const InnerPageNumbers = () => {
		let default_btn =
			"z-10 bg-white border-gray-300 text-gray-700 relative inline-flex items-center px-4 py-2 border  hover:bg-gray-50";
		let clicked_btn =
			"z-10 bg-gray-50 border-gray-500 text-gray-600 relative inline-flex items-center px-4 py-2 border  hover:bg-gray-50";
		let menuItems = [];
		if (pageCount < 6) {
			for (let i = 0; i < pageCount; i++) {
				menuItems.push(
					<button
						className={pageIndex === i ? clicked_btn : default_btn}
						onClick={() => gotoPage(i)}
					>
						{i + 1}
					</button>
				);
			}
		} else {
			let j =
				pageIndex === 0 || pageIndex === 1
					? 0
					: pageCount - pageIndex === 1 ||
					  pageCount - pageIndex === 0 ||
					  pageCount - pageIndex === 2
					? pageCount - 5
					: pageIndex - 2;
			for (let i = j; i < j + 5; i++) {
				menuItems.push(
					<button
						className={pageIndex === i ? clicked_btn : default_btn}
						onClick={() => gotoPage(i)}
					>
						{i + 1}
					</button>
				);
			}
		}
		return <div>{menuItems}</div>;
	};

	const formatEmail = (cell) => {
		return cell.value ? cell.value : cell.row.original.id
	}

	const refresh = (filter) => {
		getUsers(getAccessTokenSilently)
			.then((list) => {
				setEmpty(list.length === 0);
				return list;
			})
			.then((sorted) => {
				return filter != null ? filter(sorted) : sorted;
			})
			.then((filtered) => {
				setUsersBackup(filtered);
				setUsers(filtered);
			})
			.then(() => setLoading(false))
			.catch((error) => handleError(error));
	};

	useEffect(() => {
		refresh(null);
	}, [getAccessTokenSilently]);
	useEffect(() => {}, [users]);

	return (
		<div className="py-10 bg-gray-50 overflow-hidden rounded max-w-7xl mx-auto sm:px-6 lg:px-8">
			<header className="sm:flex sm:items-center">
				<div className="max-w-7xl mx-auto sm:px-6 lg:px-8 sm:flex-auto">
					<h1 className="text-xl font-semibold text-gray-900">
						Users
					</h1>
					<p className="mt-2 text-sm text-gray-700">
						A list of all Users
					</p>
				</div>
			</header>
			<main>
				<div className="max-w-7xl mx-auto">
					<div className="px-4 sm:px-0">
						{loading && <Loading />}
						{error != null && <span>{error.toString()}</span>}
						<main>
							{loading && <Loading />}
							{error != null && <span>{error.toString()}</span>}

							{!empty ? (
								<div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
									<div className="flex w-full items-center mt-8 justify-between">
										<div className="flex">
											<input
												className="text-sm rounded p-2 border border-gray-300 focus:border-gray-400 outline-none w-[300px]"
												placeholder="Search..."
												type="search"
												onChange={(e) =>
													handleSearch(e.target.value)
												}
											/>
											<div className="flex items-center mx-auto sm:px-6 lg:px-8">
												<p className="ml-6 text-sm text-gray-700 px-4">
													Sort by: &nbsp;
												</p>
												<select
													className="bg-gray-50 text-sm text-gray-500 rounded p-2 border border-gray-300 focus:border-gray-400 outline-none"
													onChange={(e) =>
														sortTable(
															e.target.value
														)
													}
												>
													<option
														className="text-sm text-gray-500"
														value={0}
													>
														Email: Asc
													</option>
													<option
														className="text-sm text-gray-500"
														value={1}
													>
														Email: Desc
													</option>
													<option
														className="text-sm text-gray-500"
														value={2}
													>
														Name: Asc
													</option>
													<option
														className="text-sm text-gray-500"
														value={3}
													>
														Name: Desc
													</option>
												</select>
											</div>
										</div>
									</div>
									<div className="px-4 py-8 sm:px-0">
										{/* table */}
										<div className="flex flex-col">
											<div className="-my-2 sm:-mx-6 lg:-mx-8">
												<div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
													<div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
														<table
															{...getTableProps()}
															className="min-w-full divide-y divide-gray-200"
														>
															<thead className="bg-gray-50">
																{
																	//bg-gray-50
																}
																{headerGroups.map(
																	(
																		headerGroup
																	) => (
																		<tr
																			{...headerGroup.getHeaderGroupProps()}
																		>
																			{headerGroup.headers.map(
																				(
																					column
																				) => (
																					<th
																						{...column.getHeaderProps()}
																						className={
																							"px-6 py-3.5 text-left text-sm font-semibold text-gray-900"
																						}
																					>
																						{column.render(
																							"Header"
																						)}
																					</th>
																				)
																			)}
																		</tr>
																	)
																)}
															</thead>
															<tbody
																{...getTableBodyProps()}
																className="bg-white divide-y divide-gray-200 "
															>
																{page.map(
																	(row) => {
																		prepareRow(
																			row
																		);
																		return (
																			<tr
																				{...row.getRowProps()}
																			>
																				{row.cells.map(
																					(
																						cell
																					) => {
																						return (
																							cell !=
																								null && (
																								<td
																									{...cell.getCellProps()}
																									className={
																										cell.column.id === "email"
																											? td_class_email
																											: td_class_other
																									}
																								>
																									{cell
																										.column
																										.id ===
																										"name" &&
																										cell.value}
																									{cell
																										.column
																										.id ===
																										"email" && formatEmail(cell)
																									}
																									{cell
																										.column
																										.id ===
																										"role" &&
																										cell.value}
																								</td>
																							)
																						);
																					}
																				)}
																			</tr>
																		);
																	}
																)}
															</tbody>
														</table>
														{/* pagination */}
														<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
															<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
																<div>
																	<p className=" text-gray-700">
																		Showing{" "}
																		<span className="font-medium">
																			{pageCount ===
																			0
																				? 0
																				: pageIndex *
																						pageSize +
																				  1}
																		</span>{" "}
																		to{" "}
																		<span className="font-medium">
																			{pageCount ===
																			0
																				? 0
																				: pageIndex ===
																				  pageCount -
																						1
																				? data.length
																				: pageIndex *
																						pageSize +
																				  pageSize}
																		</span>{" "}
																		of{" "}
																		<span className="font-medium">
																			{
																				data.length
																			}
																		</span>{" "}
																		{data.length ===
																		1
																			? "user"
																			: "users"}
																	</p>
																</div>
																{pageCount ===
																	1 ||
																pageCount ===
																	0 ? (
																	<div />
																) : (
																	<div>
																		<nav
																			className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
																			aria-label="Pagination"
																		>
																			<button
																				className="relative inline-flex rounded-l-md items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
																				onClick={() =>
																					gotoPage(
																						0
																					)
																				}
																				disabled={
																					!canPreviousPage
																				}
																			>
																				First
																			</button>
																			<button
																				className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
																				onClick={() =>
																					previousPage()
																				}
																				disabled={
																					!canPreviousPage
																				}
																			>
																				<span className="sr-only">
																					Previous
																				</span>
																				<ChevronLeftIcon
																					className="h-5 w-5"
																					aria-hidden="true"
																				/>
																			</button>
																			<div>
																				<InnerPageNumbers />
																			</div>
																			<button
																				className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
																				onClick={() =>
																					nextPage()
																				}
																				disabled={
																					!canNextPage
																				}
																			>
																				<span className="sr-only">
																					Next
																				</span>
																				<ChevronRightIcon
																					className="h-5 w-5"
																					aria-hidden="true"
																				/>
																			</button>
																			<button
																				className="relative inline-flex rounded-r-md items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
																				onClick={() =>
																					gotoPage(
																						pageCount -
																							1
																					)
																				}
																				disabled={
																					!canNextPage
																				}
																			>
																				Last
																			</button>
																		</nav>
																	</div>
																)}
															</div>
														</div>
													</div>
												</div>
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="max-w-7xl mx-auto sm:px-6 lg:px-8 py-10">
									<EmptyPeersPanel />
								</div>
							)}
						</main>
					</div>
				</div>
			</main>
		</div>
	);
};
export default withAuthenticationRequired(Users, {
	onRedirecting: () => <Loading />,
});
