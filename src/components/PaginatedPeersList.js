import React, { useState } from "react";
import { ChevronLeftIcon, ChevronRightIcon } from "@heroicons/react/solid";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import Loading from "../components/Loading";

// @data the data that will be paginated
// @RenderComponent the component that needs to be rendered
// @pageLimit number of Elements shown in Pagination bar
// @dataLimit maximum Elements rendered per page
const PaginatedPeersList = (props) => {
	const [pageCount] = useState(
		Math.ceil(props.data.length / props.dataLimit)
	); // actual pageCount we have
	const [currentPage, setCurrentPage] = useState(1);

	// sliding window of size pageLimit for shown elements of bar
	function goToNextPage() {
		if (currentPage === pageCount) return;
		setCurrentPage((page) => page + 1);
	}

	function goToPreviousPage() {
		if (currentPage === 1) return;
		setCurrentPage((page) => page - 1);
	}

	function changePage(event) {
		const pageNumber = Number(event.target.textContent);
		setCurrentPage(pageNumber);
	}

	function goToFirst() {
		setCurrentPage(1);
	}

	function goToLast() {
		setCurrentPage(pageCount);
	}

	const getPaginatedData = () => {
		const startIndex = currentPage * props.dataLimit - props.dataLimit;
		const endIndex = startIndex + props.dataLimit;
		return props.data.slice(startIndex, endIndex);
	};

	const compressPagination = () => {
		// if the pageLimit is greater than the actual number of pages we have, just render all pages
		if (props.pageLimit > pageCount) {
			return [...Array(pageCount).keys()].map((index) => index + 1);
		}

		// if the currentPage is already presented in the paginationBar we can just leave the bar alone
		// center the currentPage
		let bar = [];
		let offset = Math.floor(props.pageLimit / 2);

		if (currentPage - offset <= 1) {
			return [...Array(props.pageLimit).keys()].map((index) => index + 1);
		}

		if (currentPage + offset > pageCount) {
			for (let i = pageCount - props.pageLimit + 1; i <= pageCount; i++)
				bar.push(i);
			return bar;
		}

		for (let i = offset; i > 0; i--) {
			bar.push(currentPage - i);
		}
		bar.push(currentPage);
		for (let i = 1; i <= offset; i++) {
			bar.push(currentPage + i);
		}

		return bar;
	};

	function PaginationBarElem(props) {
		let default_btn =
			"z-10 bg-white border-gray-300 text-gray-700 relative inline-flex items-center px-4 py-2 border  hover:bg-gray-50";
		let clicked_btn =
			"z-10 bg-gray-50 border-gray-500 text-gray-600 relative inline-flex items-center px-4 py-2 border  hover:bg-gray-50";

		return (
			<button
				aria-current="page"
				className={
					props.pageNo === props.clicked ? clicked_btn : default_btn
				}
				onClick={changePage}
			>
				{props.pageNo}
			</button>
		);
	}

	return (
		<>
			<div className="flex flex-col">
				<div className="-my-2 sm:-mx-6 lg:-mx-8">
					<div className="py-2 align-middle inline-block min-w-full sm:px-6 lg:px-8">
						<div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
							<table className="min-w-full divide-y divide-gray-200">
								<thead className="bg-gray-50">
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
									{getPaginatedData().map((elem) =>
										props.RenderComponent(elem)
									)}
								</tbody>
							</table>
							<div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
								<div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
									<div>
										<p className=" text-gray-700">
											Showing{" "}
											<span className="font-medium">{currentPage}</span>{" "}
											to <span className="font-medium">{pageCount}</span>{" "}
											of <span className="font-medium">{pageCount}</span>
										</p>
									</div>
									{pageCount === 1 ? (
										<div />
									) : (
										<div>
											<nav
												className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
												aria-label="Pagination"
											>
												<button
													className="relative inline-flex rounded-l-md items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
													onClick={goToFirst}
												>
													First
												</button>
												<button
													className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
													onClick={goToPreviousPage}
												>
													<span className="sr-only">Previous</span>
													<ChevronLeftIcon
														className="h-5 w-5"
														aria-hidden="true"
													/>
												</button>
												<div>
													{compressPagination().map((elem) => {
														return (
															<PaginationBarElem
																clicked={currentPage}
																pageNo={elem}
																key={elem}
															/>
														);
													})}
												</div>
												<button
													className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
													onClick={goToNextPage}
												>
													<span className="sr-only">Next</span>
													<ChevronRightIcon
														className="h-5 w-5"
														aria-hidden="true"
													/>
												</button>
												<button
													className="relative inline-flex rounded-r-md items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
													onClick={goToLast}
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
		</>
	);
};

export default withAuthenticationRequired(PaginatedPeersList, {
	onRedirecting: () => <Loading />,
});
