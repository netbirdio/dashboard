import ArrowCircleRightIcon from "@heroicons/react/outline/ArrowCircleRightIcon";
import Highlight from "../Highlight";
import CopyButton from "../CopyButton";
import {classNames} from "../../utils/common";
import PropTypes from "prop-types";
import {getConfig} from "../../config";
const {grpcApiOrigin} = getConfig();

const LinuxTab = ({setupKey}) => {

    const steps = [
        {
            id: 1,
            target: 'Add Netbird\'s repository:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            commands: ["sudo apt install ca-certificates curl gnupg -y", "curl -L https://pkgs.wiretrustee.com/debian/public.key | sudo apt-key add -", "echo 'deb https://pkgs.wiretrustee.com/debian stable main' | sudo tee /etc/apt/sources.list.d/wiretrustee.list"],
            copy: true
        },
        {
            id: 2,
            target: 'Install Netbird:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["sudo apt-get update", "sudo apt-get install netbird"]
        },
        {
            id: 3,
            target: 'Optionally install Netbird Desktop UI:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["sudo apt-get install netbird-ui"]
        },
        {
            id: 4,
            target: 'Run Netbird and log in the browser:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: grpcApiOrigin === '' ? ["sudo netbird up"] : ["sudo netbird up --management-url " + grpcApiOrigin]
        },
        {
            id: 5,
            target: 'Get your IP address:',
            icon: ArrowCircleRightIcon,
            iconBackground: 'bg-gray-600',
            content: null,
            copy: true,
            commands: ["ip addr show wt0"]
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

                                                                    step.content != null ? (step.content) : (
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

export default LinuxTab;

LinuxTab.propTypes = {
    setupKey: PropTypes.object,
};

LinuxTab.defaultProps = {};