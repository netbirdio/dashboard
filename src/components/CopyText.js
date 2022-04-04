import React from 'react';

const CopyButton = ({idPrefix, text}) => {

    const copyIconId = idPrefix + "copy"
    const copySuccessIconId = idPrefix + "copy-success"
    const classHidden = "hidden"

    const handleKeyCopy = () => {
        navigator.clipboard.writeText(text)
        let copyIcon = document.getElementById(copyIconId);
        let copySuccessIcon = document.getElementById(copySuccessIconId);
        copyIcon.classList.add(classHidden);
        copySuccessIcon.classList.remove(classHidden);
        setTimeout(function() {
            copySuccessIcon.classList.add(classHidden);
            copyIcon.classList.remove(classHidden);
        }, 1200);
    }

    return (
        <button
            onClick={handleKeyCopy}
            className="whitespace-nowrap text-gray-500 hover:text-gray-400">
            <div id={copyIconId}>
                {text}
            </div>
            <div id={copySuccessIconId} className="flex flex-row hidden text-green-500">
                Copied!
            </div>
        </button>
    )

}

export default CopyButton;