import ArrowCircleRightIcon from "@heroicons/react/outline/ArrowCircleRightIcon";
import Highlight from "../Highlight";
import CopyButton from "../CopyButton";
import {classNames} from "../../utils/common";
import PropTypes from "prop-types";

const MacTab = ({setupKey}) => {

    const steps = [
        {
            id: 1,
            target: 'Download and install Brew (package manager):',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: <button className="underline text-indigo-500" onClick={()=> window.open("https://brew.sh/", "_blank")}>https://brew.sh/</button>,
            commands: [],
            copy: false
        },
        {
            id: 2,
            target: 'Install Wiretrustee:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["brew install wiretrustee/client/wiretrustee"]
        },
        {
            id: 3,
            target: 'Login and run Wiretrustee:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["sudo wiretrustee up --setup-key <PASTE-SETUP-KEY>"]
        },
        {
            id: 4,
            target: 'Get your IP address:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["sudo ipconfig getifaddr utun100"]
        },
    ]

    const formatCommands = (commands, key) => {
        return commands.map(c => key != null ? c.replace("<PASTE-SETUP-KEY>", key.Key) : c).join("\n")
    }

    return (

        <ol role="list" className="overflow-hidden">
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
                        className="relative z-10 w-8 h-8 flex items-center justify-center bg-white border-2 border-gray-300 squared-full group-hover:border-gray-400">
                      <span className="text-m font-mono text-gray-700">{step.id}</span>
                    </span>
                  </span>
                            <span className="ml-4 min-w-0 ">
                    <span className="text-m tracking-wide font-mono text-gray-700">{step.target}</span>
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
                                                                       idPrefix={"add-peer-code-" + step.id}/>)}

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