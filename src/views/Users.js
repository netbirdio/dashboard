import React, { useEffect, useState } from "react";
import { withAuthenticationRequired } from "@auth0/auth0-react";
import Loading from "../components/Loading";

export const Users = () => {
	return (
		<>
			<div className="py-10">
				<header>
					<div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
						<h1 className="text-2xl font-mono leading-tight text-gray-900 font-bold">
							Users
						</h1>
					</div>
				</header>
				<main>
					<div className="max-w-5xl mx-auto sm:px-6 lg:px-8">
						<div className="px-4 py-8 sm:px-0">
							<h1 className="text-m font-mono leading-tight text-gray-900 font-bold">
                                Manage and review Users.
							</h1>
							<br />
							<p className="text-sm font-mono">
								Here you will see the users associated to this
								Account. 
							</p>
							<br />
							<p className="text-sm font-mono">Stay tuned.</p>
						</div>
					</div>
				</main>
			</div>
		</>
	);
};

export default withAuthenticationRequired(Users, {
	onRedirecting: () => <Loading />,
});
