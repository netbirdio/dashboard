import { XIcon } from "@heroicons/react/outline";
import { useState } from "react";

export default function Banner() {
	const [show, setShow] = useState(true);

	const dismiss = () => {
		setShow(false);
	};

	return show ? (
		<div className="relative bg-indigo-500">
			<div className="max-w-7xl mx-auto py-1 px-1 sm:px-6 lg:px-8">
				<div className="pr-16 sm:text-center text-white sm:px-16">
					<p className="font-normal">
						<span className="md:hidden">
							Big news! Wiretrustee becomes <strong>netbird</strong>!
						</span>
						<span className="hidden md:inline">
							Big news! Wiretrustee becomes <strong>netbird</strong>!
						</span>
						<span className="block sm:ml-2 sm:inline-block">
							<a
								href="https://blog.netbird.io/wiretrustee-becomes-netbird"
								className="font-bold underline"
								target="_blank"
								rel="noreferrer"
							>
								{" "}
								Learn more{" "}
								<span aria-hidden="true">&rarr;</span>
							</a>
						</span>
					</p>
				</div>
				<div className="absolute inset-y-0 right-0 pt-1 pr-1 flex items-start sm:pt-1 sm:pr-2 sm:items-start">
					<button
						type="button"
						className="flex p-1 rounded-md hover:bg-indigo-500 text-white focus:outline-none focus:ring-2 focus:ring-white"
						onClick={dismiss}
					>
						<span className="sr-only">Dismiss</span>
						<XIcon
							className="h-4 w-4"
							aria-hidden="true"
						/>
					</button>
				</div>
			</div>
		</div>
	) : null;
}
