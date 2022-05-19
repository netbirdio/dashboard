import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import {ChevronLeftIcon, ChevronRightIcon} from "@heroicons/react/solid";
import React, {useEffect, useState} from "react";
// import PaginatedPeersList from "../components/PaginatedPeersList"
import {usePagination, useTable} from "react-table";
import {getRules} from "../api/ManagementAPI";
import EmptyPeersPanel from "../components/EmptyPeers";
import Loading from "../components/Loading";
import EditButton from "../components/EditButton";

export const AccessControls = () => {
    const [rules, setRules] = useState([]);
    const [rulesBackup, setRulesBackup] = useState([]);
    const [empty, setEmpty] = useState(true);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const {getAccessTokenSilently} = useAuth0();

    const handleError = (error) => {
        console.error("Error to fetch data:", error);
        setLoading(false);
        setError(error);
    };
    // Add React Table
    const data = React.useMemo(() => rules, [rules]);

    const columns = React.useMemo(
        () => [
            {
                Header: "Title",
                accessor: "Name",
            },
            {
                Header: "Status",
                accessor: "Enabled",
            },
            {
                Header: "Sources",
                accessor: "Source",
            },
            {
                Header: "Direction",
                accessor: "Flow",
            },
            {
                Header: "Destinations",
                accessor: "Destination",
            },
        ],
        []
    );
    const td_class_name =
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
        state: {pageIndex, pageSize},
    } = useTable(
        {columns, data, initialState: {pageIndex: 0, pageSize: 5}},
        usePagination
    );

    const formatGroups = (cell) => {
        const groups = new Map(Object.entries(cell.value));
        if (groups.size === 1) {
            const [firstValue] = groups.values();
            return firstValue;
        }
        return groups.size + " Groups"
    }

    const handleSearch = (e) => {
        let tempArray = rulesBackup.filter((item) => {
            return item.Name.toUpperCase().includes(e.toUpperCase())
        });
        setRules(tempArray);
    };

    const sortTable = (e) => {
        let ruleCopy = [...rules];
        if (e === "0") {
            ruleCopy.sort((a, b) => (a.Name > b.Name ? 1 : -1));
        } else if (e === "1") {
            ruleCopy.sort((a, b) => (a.Name > b.Name ? -1 : 1));
        } else {
            console.log(`Sorry, we are out of ${e}`, e);
        }
        setRules(ruleCopy);
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

    const showAll = () => {
        const showAllBtn = document.getElementById("btn-show-all");
        const showOnlineBtn = document.getElementById("btn-show-online");

        showAllBtn.classList.add(
            "ring-1",
            "ring-indigo-500",
            "border-indigo-500",
            "outline-none"
        );
        showOnlineBtn.classList.remove(
            "ring-1",
            "ring-indigo-500",
            "border-indigo-500",
            "outline-none"
        );
        refresh(null);
    };

    const showEnabled = () => {
        const showAllBtn = document.getElementById("btn-show-all");
        const showOnlineBtn = document.getElementById("btn-show-online");

        showOnlineBtn.classList.add(
            "ring-1",
            "ring-indigo-500",
            "border-indigo-500",
            "outline-none"
        );
        showAllBtn.classList.remove(
            "ring-1",
            "ring-indigo-500",
            "border-indigo-500",
            "outline-none"
        );

        refresh(function (rules) {
            return rules.filter((rule) => {
                return rule.Enabled;
            });
        });
    };

    const refresh = (filter) => {
        getRules(getAccessTokenSilently)
            .then((list) => {
                setEmpty(list.length === 0);
                return list;
            })
            .then((sorted) => {
                return filter != null ? filter(sorted) : sorted;
            })
            .then((filtered) => {
                setRulesBackup(filtered);
                setRules(filtered);
            })
            .then(() => setLoading(false))
            .catch((error) => handleError(error));
    };

    useEffect(() => {
        refresh(null);
    }, [getAccessTokenSilently]);
    useEffect(() => {
    }, [rules]);

    return (
        <div className="py-10 bg-gray-50 overflow-hidden rounded max-w-7xl mx-auto sm:px-6 lg:px-8">
            <header className="sm:flex sm:items-center">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 sm:flex-auto">
                    <h1 className="text-xl font-semibold text-gray-900">Access Control</h1>
                    <p className="mt-2 text-sm text-gray-700">
                        Create and control access groups
                    </p>
                </div>
            </header>
            <main>
                <div className="max-w-7xl mx-auto">
                    <div className="px-4 sm:px-0">
                        {loading && <Loading/>}
                        {error != null && <span>{error.toString()}</span>}
                        <main>
                            {loading && <Loading/>}
                            {error != null && <span>{error.toString()}</span>}

                            {!empty ? (
                                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                                    <div className="auto py-8">
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
                                                    <p className="ml-0 text-sm text-gray-700 lg:px-4 md:pr-2 pr-2">Sort
                                                        by: &nbsp;</p>
                                                    <select
                                                        className="bg-gray-50 flex-1 lg:flex-grow-0 text-sm text-gray-500 rounded p-2 border border-gray-300 focus:border-gray-400 outline-none"
                                                        onChange={(e) => sortTable(e.target.value)}
                                                    >
                                                        <option className="text-sm text-gray-500" value={0}>Name: Asc
                                                        </option>
                                                        <option className="text-sm text-gray-500" value={1}>Name: Desc
                                                        </option>
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
                                                        id="btn-show-online"
                                                        onClick={() => showEnabled()}
                                                        className="relative inline-flex items-center px-4 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-700 outline-none hover:bg-gray-50"
                                                    >
                                                      Enabled
                                                    </button>
                                                  </span>
                                                </div>
                                            </div>
                                            <div className="lg:flex lg:justify-end">
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto"
                                                >
                                                    Add Rule
                                                </button>

                                            </div>
                                        </div>
                                    </div>

                                    <div className="px-4 py-2 sm:px-0">
                                        {/* table */}
                                        <div className="flex flex-col">
                                            <div className="-my-2 sm:-mx-6 lg:-mx-8">
                                                <div className="py-2 align-middle min-w-full sm:px-6 lg:px-8">
                                                    <div
                                                        className="shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                                                        <div className="overflow-x-auto">

                                                            <table
                                                                {...getTableProps()}
                                                                className="min-w-full divide-y divide-gray-200"
                                                            >
                                                                <thead className="bg-gray-50">
                                                                {headerGroups.map((headerGroup) => (
                                                                    <tr {...headerGroup.getHeaderGroupProps()}>
                                                                        {headerGroup.headers.map((column, i) => (
                                                                            <th
                                                                                {...column.getHeaderProps()}
                                                                                className={
                                                                                    i === 0
                                                                                        ? "px-6 py-3.5 text-left text-sm font-semibold text-gray-900"
                                                                                        : "px-3 py-3.5 text-left text-sm font-semibold text-gray-900"
                                                                                }
                                                                            >
                                                                                {column.render("Header")}
                                                                            </th>
                                                                        ))}
                                                                        <th
                                                                            scope="col"
                                                                            className="relative px-6 py-3"
                                                                        >
                                                                            <span className="sr-only">Edit</span>
                                                                        </th>
                                                                    </tr>
                                                                ))}
                                                                </thead>
                                                                <tbody
                                                                    {...getTableBodyProps()}
                                                                    className="bg-white divide-y divide-gray-200"
                                                                >
                                                                {page.map((row) => {
                                                                    prepareRow(row);
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
                                                                                                    cell.column.id === "Name"
                                                                                                        ? td_class_name
                                                                                                        : td_class_other
                                                                                                }
                                                                                            >
                                                                                                {cell
                                                                                                        .column
                                                                                                        .id ===
                                                                                                    "ID" &&
                                                                                                    cell.value}
                                                                                                {cell
                                                                                                        .column
                                                                                                        .id ===
                                                                                                    "Name" &&
                                                                                                    cell.value}

                                                                                                {cell
                                                                                                        .column
                                                                                                        .id ===
                                                                                                    "Source" &&
                                                                                                    formatGroups(cell)}

                                                                                                {cell
                                                                                                        .column
                                                                                                        .id ===
                                                                                                    "Destination" &&
                                                                                                    formatGroups(cell)}

                                                                                                {cell.column.id === "Flow" &&
                                                                                                    (cell.value === 0 ? (
                                                                                                            <span
                                                                                                                className="inline-flex rounded-full bg-indigo-100 px-2 text-xs leading-5 text-indigo-800">
                                                                                                                    <svg
                                                                                                                        xmlns="http://www.w3.org/2000/svg"
                                                                                                                        className="h-5 w-10"
                                                                                                                        fill="none"
                                                                                                                        viewBox="0 0 24 24"
                                                                                                                        stroke="currentColor"
                                                                                                                        strokeWidth={1}>
                                                                                                                      <path
                                                                                                                          strokeLinecap="round"
                                                                                                                          strokeLinejoin="round"
                                                                                                                          d="M7 16l-4-4m0 0l4-4m-4 4h18 M17 8l4 4m0 0l-4 4m4-4H3"/>
                                                                                                                    </svg>

                                                                                                            </span>
                                                                                                    ) : (
                                                                                                        <span
                                                                                                            className="inline-flex rounded-full bg-red-100 px-2 text-xs leading-5 text-red-800">
                                                                                                               offline
                                                                                                            </span>
                                                                                                    ))}

                                                                                                {cell.column.id === "Enabled" &&
                                                                                                    (cell.value === true ? (
                                                                                                        <span
                                                                                                            className="inline-flex text-center rounded-full bg-green-100 px-2 text-xs leading-5 text-green-800">
                                                                                                            Enabled
                                                                                                          </span>
                                                                                                    ) : (
                                                                                                        <span
                                                                                                            className="inline-flex rounded-full bg-gray-100 px-2 text-xs leading-5 text-gray-500">
                                                                                                            Disabled
                                                                                                          </span>
                                                                                                    ))}
                                                                                            </td>
                                                                                        )
                                                                                    );
                                                                                }
                                                                            )}
                                                                            <td className={td_class_other}>
                                                                                <div className="relative">
                                                                                    <EditButton
                                                                                        items={[{ name: "Edit" }, { name: "Disable" }]}
                                                                                        /*handler={(action) =>
                                                                                            handleRowMenuClick(
                                                                                                action,
                                                                                                row.cells
                                                                                            )
                                                                                        }*/
                                                                                    />
                                                                                </div>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                        {/* pagenation */}
                                                        <div
                                                            className="bg-white px-4 py-3 flex items-center justify-center sm:justify-between border-t border-gray-200 sm:px-6">
                                                            <div
                                                                className="sm:flex-1 sm:flex sm:items-center sm:justify-between">
                                                                <div>
                                                                    <p className="text-gray-700 text-center sm:text-left">
                                                                        Showing{" "}
                                                                        <span className="font-medium">
                                        {pageCount === 0
                                            ? 0
                                            : pageIndex * pageSize + 1}
                                      </span>{" "}
                                                                        to{" "}
                                                                        <span className="font-medium">
                                        {pageCount === 0
                                            ? 0
                                            : pageIndex === pageCount - 1
                                                ? data.length
                                                : pageIndex * pageSize + pageSize}
                                      </span>{" "}
                                                                        of{" "}
                                                                        <span className="font-medium">
                                        {data.length}
                                      </span>{" "}
                                                                        {data.length === 1 ? "group" : "groups"}
                                                                    </p>
                                                                </div>
                                                                {pageCount === 1 || pageCount === 0 ? (
                                                                    <div/>
                                                                ) : (
                                                                    <div>
                                                                        <nav
                                                                            className="py-3 relative z-0 inline-flex rounded-md shadow-sm -space-x-px"
                                                                            aria-label="Pagination"
                                                                        >
                                                                            <button
                                                                                className="relative inline-flex rounded-l-md items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
                                                                                onClick={() => gotoPage(0)}
                                                                                disabled={!canPreviousPage}
                                                                            >
                                                                                First
                                                                            </button>
                                                                            <button
                                                                                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
                                                                                onClick={() => previousPage()}
                                                                                disabled={!canPreviousPage}
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
                                                                                <InnerPageNumbers/>
                                                                            </div>
                                                                            <button
                                                                                className="relative inline-flex items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
                                                                                onClick={() => nextPage()}
                                                                                disabled={!canNextPage}
                                                                            >
                                                                                <span className="sr-only">Next</span>
                                                                                <ChevronRightIcon
                                                                                    className="h-5 w-5"
                                                                                    aria-hidden="true"
                                                                                />
                                                                            </button>
                                                                            <button
                                                                                className="relative inline-flex rounded-r-md items-center px-2 py-2 border border-gray-300 bg-white  text-gray-500 hover:bg-gray-50"
                                                                                onClick={() => gotoPage(pageCount - 1)}
                                                                                disabled={!canNextPage}
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
                                    <EmptyPeersPanel/>
                                </div>
                            )}
                        </main>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default withAuthenticationRequired(AccessControls, {
    onRedirecting: () => <Loading/>,
});
