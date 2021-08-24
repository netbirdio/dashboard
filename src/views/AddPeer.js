import React, {useEffect, useState} from "react";
import {useAuth0, withAuthenticationRequired} from "@auth0/auth0-react";
import Loading from "../components/Loading";
import {getSetupKeys} from "../api/ManagementAPI";
import ArrowCircleRightIcon from "@heroicons/react/outline/ArrowCircleRightIcon";
import Highlight from "../components/Highlight";
import Select from "../components/Select";
import CopyButton from "../components/CopyButton";


function classNames(...classes) {
    return classes.filter(Boolean).join(' ')
}

export const AddPeerComponent = () => {

        const [setupKeys, setSetupKeys] = useState([])
        const [loading, setLoading] = useState(true)
        const [error, setError] = useState(null)

        const steps = [
            {
                id: 1,
                target: 'Select setup key to register peer:',
                icon: ArrowCircleRightIcon,
                iconBackground: 'bg-gray-600',
                content: (<Select data={setupKeys.filter(k => k.Valid)}/>),
                copy: false
            },
            {
                id: 2,
                target: 'Add Wiretrustee\'s repository:',
                icon: ArrowCircleRightIcon,
                iconBackground: 'bg-gray-600',
                content: (
                    <Highlight language="bash">
                        {`curl -fsSL https://pkgs.wiretrustee.com/stable/ubuntu/focal.gpg | sudo apt-key add - \ncurl -fsSL https://pkgs.wiretrustee.com/stable/ubuntu/focal.list | sudo tee /etc/apt/sources.list.d/wiretrustee.list`}
                    </Highlight>

                ),
                copy: true
            },
            {
                id: 3,
                target: 'Install Wiretrustee:',
                icon: ArrowCircleRightIcon,
                iconBackground: 'bg-gray-600',
                content: (
                    <Highlight language="bash">
                        {`sudo apt-get update \nsudo apt-get install wiretrustee`}
                    </Highlight>
                ),
                copy: true
            },
            {
                id: 4,
                target: 'Login and run Wiretrustee:',
                icon: ArrowCircleRightIcon,
                iconBackground: 'bg-gray-600',
                content: (
                    <Highlight language="bash">
                        {"sudo wiretrustee login --setup-key xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \nsudo systemctl start wiretrustee"}
                    </Highlight>
                ),
                copy: true
            },
            {
                id: 5,
                target: 'Get your IP address:',
                icon: ArrowCircleRightIcon,
                iconBackground: 'bg-gray-600',
                content: (
                    <Highlight language="bash">
                        {`ip addr show wt0`}
                    </Highlight>
                ),
                copy: true
            },
            {
                id: 6,
                target: 'Repeat on other machines.',
                icon: ArrowCircleRightIcon,
                iconBackground: 'bg-gray-600',
                copy: false
            },
        ]

        const {
            getAccessTokenSilently,
        } = useAuth0();

        const handleError = error => {
            console.error('Error to fetch data:', error);
            setLoading(false)
            setError(error);
        };

        useEffect(() => {
            getSetupKeys(getAccessTokenSilently)
                .then(responseData => setSetupKeys(responseData))
                .then(() => setLoading(false))
                .catch(error => handleError(error))
        }, [getAccessTokenSilently])

        return (

            <>
                <div className="py-10">
                    <header>
                        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                            <h1 className="text-2xl leading-tight text-gray-900 font-mono font-bold">Add Peer</h1>
                        </div>
                    </header>

                    <main>
                        <div className="max-w-7xl mx-auto sm:px-6 lg:px-8">
                            <div className="px-4 py-8 sm:px-0">
                                {loading && (<Loading/>)}
                                {error != null && (
                                    <span>{error.toString()}</span>
                                )}
                                {setupKeys && (<nav aria-label="Progress">
                                    <ol role="list" className="overflow-hidden">
                                        {steps.map((step, stepIdx) => (
                                            <li key={step.id}
                                                className={classNames(stepIdx !== steps.length - 1 ? 'pb-10' : '', 'relative')}>

                                                <>
                                                    {stepIdx !== steps.length - 1 ? (
                                                        <div
                                                            className="-ml-px absolute mt-0.5 top-4 left-4 w-0.5 h-full bg-gray-300"
                                                            aria-hidden="true"/>
                                                    ) : null}
                                                    <a href={step.href} className="relative flex items-start group">

                  <span className="h-9 " aria-hidden="true">
                    <span
                        className="relative z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 squared-full group-hover:border-gray-400">
                      <span className="text-m font-mono text-gray-700">{step.id}</span>
                    </span>
                  </span>
                                                        <span className="ml-4 min-w-0 ">
                    <span className="text-m font-semibold tracking-wide font-mono text-gray-700">{step.target}</span>
                                        <div className="flex flex-col space-y-2 ">
                                                            <span
                                                                className="text-sm text-gray-500">{step.content}</span>
                                            {step.copy && (<CopyButton toCopy={step.content.children}
                                                                       idPrefix={"add-peer-code-" + step.id}/>)}

                                        </div>
                  </span>
                                                    </a>
                                                </>
                                            </li>
                                        ))}
                                    </ol>
                                </nav>)}

                            </div>
                        </div>
                    </main>
                </div>
            </>
        );
    }
;

export default withAuthenticationRequired(AddPeerComponent,
    {
        onRedirecting: () => <Loading/>,
    }
);
