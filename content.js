// Wait for the Command + J shortcut to be pressed
document.addEventListener("keydown", (event) => {
    if (event.metaKey && event.code === "KeyJ") {
        console.log("Command + J detected. Triggering login process.");
        startLoginProcess();
    }
});

function startLoginProcess() {
    chrome.storage.sync.get("preference", (result) => {
        console.log(result);

        const preference = result.preference || "google"; // Default to Google if no preference is set
        const loginMethod = preference === "google" ? "Google" : "Facebook";

        console.log(preference);

        console.log(`Attempting to log in using ${loginMethod}`);

        checkLoginStatus(preference).then((isLoggedIn) => {
            if (isLoggedIn) {
                console.log("User is already logged in.");
            } else {
                console.log("User is not logged in. Starting login process...");
                recursiveLogin(preference);
            }
        });
    });
}

function checkLoginStatus(preference) {
    return new Promise((resolve) => {
        try {
            if (preference === "google") {
                chrome.cookies.get({ url: "https://accounts.google.com", name: "SID" }, (cookie) => {
                    if (cookie) {
                        console.log("Google login detected (SID cookie found).");
                        resolve(true);
                    } else {
                        console.log("Google SID cookie not found, user may not be logged in.");
                        resolve(false);
                    }
                });
            } else if (preference === "facebook") {
                chrome.cookies.get({ url: "https://www.facebook.com", name: "c_user" }, (cookie) => {
                    if (cookie) {
                        console.log("Facebook login detected (c_user cookie found).");
                        resolve(true);
                    } else {
                        console.log("Facebook c_user cookie not found, user may not be logged in.");
                        resolve(false);
                    }
                });
            } else {
                resolve(false);
            }
        } catch (error) {
            resolve(false);
        }
    });
}

function clickLoginButton(preference) {
    const buttons = document.querySelectorAll("button, input[type='button'], input[type='submit'], div");
    let found = false;

    buttons.forEach((button) => {
        const text = button.innerText.toLowerCase();
        if (preference === "google" && (text.includes("google") || text.includes("sign in with google"))) {
            simulateClick(button);
            console.log("Google login button clicked.");
            found = true;
        } else if (preference === "facebook" && (text.includes("facebook") || text.includes("sign in with facebook"))) {
            simulateClick(button);
            console.log("Facebook login button clicked.");
            found = true;
        } else if (text.includes("login") || text.includes("sign in") || text.includes("continue")) {
            simulateClick(button);
            found = true;
        }
    });

    return found;
}

function simulateClick(element) {
    const eventTypes = ['mousedown', 'mouseup', 'click'];
    eventTypes.forEach((eventType) => {
        const event = new MouseEvent(eventType, {
            bubbles: true,
            cancelable: true,
            view: window
        });
        element.dispatchEvent(event);
    });
    console.log('Click event dispatched.');
}

function recursiveLogin(preference) {
    checkLoginStatus(preference).then((isLoggedIn) => {
        if (isLoggedIn) {
            console.log("User is already logged in.");
        } else {
            console.log("User is not logged in. Starting login process...");

            if (!clickLoginButton(preference)) {
                console.log("Login button not found, retrying...");
            }
        }
    });
}