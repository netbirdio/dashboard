import React from 'react';

const CopyButton = ({idPrefix, toCopy}) => {

    const copyIconId = idPrefix + "copy"
    const copySuccessIconId = idPrefix + "copy-success"
    const classHidden = "hidden"

    const handleKeyCopy = () => {
        navigator.clipboard.writeText(toCopy)
        let copyIcon = document.getElementById(copyIconId);
        let copySuccessIcon = document.getElementById(copySuccessIconId);
        copyIcon.classList.add(classHidden);
        copySuccessIcon.classList.remove(classHidden);
        setTimeout(function() {
            copySuccessIcon.classList.add(classHidden);
            copyIcon.classList.remove(classHidden);
        }, 1500);
    }

    return (
        <button
            onClick={handleKeyCopy}
            className="whitespace-nowrap font-medium text-gray-500 hover:text-gray-400">
            <svg id={copyIconId} xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2"/>
            </svg>
            <svg id={copySuccessIconId} xmlns="http://www.w3.org/2000/svg" className="hidden h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24"
                 stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
            </svg>
        </button>
    )

}

export default CopyButton;