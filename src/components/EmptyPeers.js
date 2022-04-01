import {Link} from 'react-router-dom'

export default function EmptyPeersPanel() {
    return (
        <Link
            as="button"
            to="/add-peer"
            className="relative block w-full border-2 border-gray-300 border-dashed rounded p-12 text-center hover:border-gray-400 focus:outline-none"
        >
            <svg
                className="mx-auto h-12 w-12 text-indigo-500"
                xmlns="http://www.w3.org/2000/svg"
                stroke="currentColor"
                fill="none"
                viewBox="0 0 48 48"
                aria-hidden="true"
            >
                <path
                    strokeLinecap="square"
                    strokeLinejoin="square"
                    strokeWidth={2}
                    d="M8 14v20c0 4.418 7.163 8 16 8 1.381 0 2.721-.087 4-.252M8 14c0 4.418 7.163 8 16 8s16-3.582 16-8M8 14c0-4.418 7.163-8 16-8s16 3.582 16 8m0 0v14m0-4c0 4.418-7.163 8-16 8S8 28.418 8 24m32 10v6m0 0v6m0-6h6m-6 0h-6"
                />
            </svg>
            <span
                className="mt-2 block font-normal text-sm text-gray-700">Let's get started by adding your first peer</span>
        </Link>
    )
}