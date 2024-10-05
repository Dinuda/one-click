console.log("Content script loaded");

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.command === "login") {
        const usernameField = document.querySelector('input[type="text"], input[name="username"], input[id="username"]');
        const passwordField = document.querySelector('input[type="password"], input[name="password"], input[id="password"]');
        const loginButton = document.querySelector('button[type="submit"], input[type="submit"]');

        if (usernameField && passwordField && loginButton) {
            usernameField.value = request.username;
            passwordField.value = request.password;
            loginButton.click();
            sendResponse({ success: true, message: 'Logged in successfully.' });
        } else {
            sendResponse({ success: false, message: 'Login fields not found.' });
        }
    }
});
