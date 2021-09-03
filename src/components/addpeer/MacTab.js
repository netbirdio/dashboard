import ArrowCircleRightIcon from "@heroicons/react/outline/ArrowCircleRightIcon";
import Highlight from "../Highlight";
import CopyButton from "../CopyButton";
import {classNames} from "../../utils/common";
import PropTypes from "prop-types";

const MacTab = ({setupKey}) => {

    const steps = [
        {
            id: 1,
            target: 'Download latest release (Darwin asset):',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: <button className="underline text-indigo-500" onClick={()=> window.open("https://github.com/wiretrustee/wiretrustee/releases", "_blank")}>Wiretrustee GitHub Releases</button>,
            //content: <a href="https://github.com/wiretrustee/wiretrustee/releases">Wiretrustee GitHub Releases</a>,
            commands: [],
            copy: false
        },
        {
            id: 2,
            target: 'Decompress and move to a fixed path in your system:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["tar -xvzf wiretrustee_0.1.0-rc-1_darwin_amd64.tar.gz","sudo mv wiretrusee /usr/local/bin/wiretrustee", "sudo chmod +x /usr/local/bin/wiretrustee"]
        },
        {
            id: 3,
            target: 'Configure MAC\'s PATH environment variable:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["export PATH=$PATH:/usr/local/bin"]
        },
        {
            id: 4,
            target: 'Login and run Wiretrustee:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["sudo wiretrustee login --setup-key <PASTE-SETUP-KEY>", "sudo wiretrustee up &"]
        },
        {
            id: 5,
            target: 'Get your IP address:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["sudo ipconfig getifaddr utun100"]
        },
        {
            id: 6,
            target: 'Repeat on other machines.',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            copy: false,
            content: null,
            commands: null
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