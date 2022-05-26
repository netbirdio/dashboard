import ArrowCircleRightIcon from "@heroicons/react/outline/ArrowCircleRightIcon";
import Highlight from "../Highlight";
import CopyButton from "../CopyButton";
import {classNames} from "../../utils/common";
import PropTypes from "prop-types";
import {getConfig} from "../../config";
const {grpcApiOrigin} = getConfig();

const MacTab = ({setupKey}) => {

    const steps = [
        {
            id: 1,
            target: 'Download and install Brew (package manager):',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: <button type="button"
                             onClick={() => window.open("https://brew.sh/")}
                             className="inline-flex items-center justify-center rounded-md border border-transparent bg-indigo-500 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 sm:w-auto">
                Download Brew
            </button>,
            commands: [],
            copy: false
        },
        {
            id: 2,
            target: 'Install Netbird:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["# for CLI only\nbrew install netbirdio/tap/netbird", "# for GUI package\nbrew install --cask netbirdio/tap/netbird-ui"]
        },
        {
            id: 3,
            target: 'Run Netbird and log in the browser:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: grpcApiOrigin === '' ? ["sudo netbird up"] : ["sudo netbird up --management-url " + grpcApiOrigin]
        },
        {
            id: 4,
            target: 'Get your IP address:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["sudo ifconfig utun100"]
        },
    ]

    const formatCommands = (commands, key) => {
        return commands.map(c => key != null ? c.replace("<PASTE-SETUP-KEY>", key.Key) : c).join("\n")
    }

    return (

        <ol className="overflow-hidden">
            {steps.map((step, stepIdx) => (
                <li key={"linux-tab-step-" + step.id}
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
                        className="relative z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 rounded group-hover:border-gray-400">
                      <span className="text-m text-gray-700">{step.id}</span>
                    </span>
                  </span>
                            <span className="ml-4 min-w-0 ">
                    <span className="tracking-wide text-gray-700">{step.target}</span>
                                        <div className="flex flex-col space-y-2 ">
                                                            <span
                                                                className="text-sm text-gray-500">
                                                                {

                                                                    step.content != null ? (
                                                                        <div className="font-mono underline mt-4">
                                                                            {step.content}
                                                                        </div>
                                                                    ) : (
                                                                        step.commands && (<Highlight language="bash">
                                                                            {formatCommands(step.commands, setupKey)}
                                                                        </Highlight>)
                                                                    )
                                                                }

                                                            </span>
                                            {step.copy && (<CopyButton toCopy={formatCommands(step.commands, setupKey)}
                                                                       idPrefix={"add-peer-code-mac-" + step.id}/>)}

                                        </div>
                  </span>
                        </a>
                    </>
                </li>
            ))}

        </ol>
    )
}

export default MacTab;

MacTab.propTypes = {
    setupKey: PropTypes.object,
};

MacTab.defaultProps = {};