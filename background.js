chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension Installed");

    chrome.runtime.onInstalled.addListener((details) => {
        if (details.reason === "install") {
            console.log("Extension Installed");
            chrome.action.openPopup();
        }
    });
});

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request.action);

    if (request.action === "setPreference") {
        document.cookie = `preference=${request.preference}; path=/; max-age=31536000`; // Save for 1 year
        console.log(`${request.preference} preference saved.`);
        sendResponse({ status: "success" });
    }
});
