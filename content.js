document.addEventListener("keydown", debounce((event) => {
    if (event.metaKey && event.code === "KeyJ") {
        console.log("Command + B detected. Triggering login process.");
        startLoginProcess();
    }
}, 300)); // Debounce added with 300ms delay

// Prevent any link from opening a new tab
// document.addEventListener('click', function (event) {
//     const target = event.target.closest('a');

//     if (target && target.tagName.toLowerCase() === 'a') {
//         event.preventDefault(); // Prevent the default link action
//         console.log("Prevented a link from opening in a new tab/window.");
//     }
// });

// Prevent window.open from opening new tabs/windows
window.open = function () {
    console.log("window.open is disabled to prevent opening new tabs.");
};

// Override link clicks with target="_blank" or JS calls attempting to open new windows
const observer = new MutationObserver(function (mutationsList) {
    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
            mutation.addedNodes.forEach((node) => {
                if (node.tagName && node.tagName.toLowerCase() === 'a') {
                    node.removeAttribute('target'); // Remove target="_blank"
                }
            });
        }
    });
});

// Start observing the document for any new links being added
observer.observe(document.body, { childList: true, subtree: true });

var email = null;

function startLoginProcess() {
    chrome.storage.sync.get("preference", (result) => {
        console.log(result);

        const preference = result.preference || "google"; // Default to Google if no preference is set
        const loginMethod = preference === "google" ? "Google" : "Facebook";

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

function findBestLoginButton(preference, email) {
    const elements = document.querySelectorAll("button, input[type='button'], input[type='submit'], div, a, span");

    const loginKeywords = [
        "login", "log in", "signin", "sign in", "sign-in", "continue",
        "register", "create account", "sign up", "signup"
    ];

    const socialLoginKeywords = {
        google: ["google", "sign in with google", "continue with google", "google login"],
        facebook: ["facebook", "sign in with facebook", "continue with facebook", "facebook login"],
    };

    const chooseAccountKeywords = ["choose an account", "select an account", "select account", "choose account"];

    let bestElement = null;
    let secondBestElement = null;
    let bestScore = -Infinity;
    let secondBestScore = -Infinity;

    elements.forEach((element) => {
        const text = element.innerText.trim().toLowerCase();
        const ariaLabel = (element.getAttribute('aria-label') || '').trim().toLowerCase();
        const title = (element.getAttribute('title') || '').trim().toLowerCase();
        const value = (element.getAttribute('value') || '').trim().toLowerCase();
        const placeholder = (element.getAttribute('placeholder') || '').trim().toLowerCase();
        const name = (element.getAttribute('name') || '').trim().toLowerCase();
        const id = (element.getAttribute('id') || '').trim().toLowerCase();
        const className = (element.getAttribute('class') || '').trim().toLowerCase();
        const identifier = (element.getAttribute('data-email') || '').trim().toLowerCase();

        const attributes = [text, ariaLabel, title, value, placeholder, name, id, className, identifier];
        const allText = attributes.join(' ');

        let score = 0;

        // Ignore elements with the 'hidden' class or explicitly hidden styles
        if (className.includes('hidden') || window.getComputedStyle(element).display === 'none') {
            score -= 100;  // Major penalty for hidden elements
        }

        // Social Login Preference
        if (preference && socialLoginKeywords[preference]) {
            socialLoginKeywords[preference].forEach(keyword => {
                if (allText.includes(keyword)) score += 5;
            });
        }

        // Standard Login Keywords
        loginKeywords.forEach(keyword => {
            if (allText.includes(keyword)) score += 40;  // Increase weight for direct login-related keywords
        });

        // Choose Account Keywords
        chooseAccountKeywords.forEach(keyword => {
            if (allText.includes(keyword)) score += 2;
        });

        // Email Match for Identifying Users
        if (email === identifier) score += 100;

        // Visibility & Display Heuristics
        const style = window.getComputedStyle(element);
        if (style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0') {
            score += 2;  // Fully visible element
        }

        // Size Penalty (Favor elements larger than a minimum size but penalize very large ones)
        const rect = element.getBoundingClientRect();
        const area = rect.width * rect.height;
        if (area > 0 && area > 50 && area < 600) {  // Element with reasonable size (avoid too small)
            score -= Math.log(area);  // Penalize large elements
        } else {
            score -= 50;  // Heavily penalize elements that are too small or have an area close to zero
        }

        // Penalize non-interactive divs/spans even if styled as buttons
        // const tagName = element.tagName.toLowerCase();
        // if (tagName === 'div' || tagName === 'span') {
        //     if (!element.onclick) {
        //         score -= 30;  // Heavily penalize non-interactive divs/spans
        //     }
        // }

        // Clickability Heuristics
        if (element.onclick || element.tagName.toLowerCase() === 'button' ||
            (element.tagName.toLowerCase() === 'input' && ['button', 'submit'].includes(element.type.toLowerCase()))) {
            score += 10;  // Prefer buttons
        } else if (element.tagName.toLowerCase() === 'a') {
            score += 5;  // Penalize links
        }

        // Assigning Best and Second-Best Elements
        if (score > bestScore) {
            secondBestElement = bestElement;
            secondBestScore = bestScore;
            bestElement = element;
            bestScore = score;
        } else if (score > secondBestScore) {
            secondBestElement = element;
            secondBestScore = score;
        }
    });

    return { bestElement, secondBestElement };
}




function clickLoginButton(preference, email) {
    const { bestElement, secondBestElement } = findBestLoginButton(preference, email);

    if (bestElement) {
        simulateClick(bestElement);
        console.log("Clicked the best matching login button:", bestElement);
    }

    if (secondBestElement) {
        simulateClick(secondBestElement);
        console.log("Clicked the second best matching login button:", secondBestElement);
        return true;
    }

    console.log("No suitable login button found.");
    return false;
}

// Helper function to debounce actions
function debounce(func, delay) {
    let timeout;
    return function (...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// Simulate click on the element
function simulateClick(element) {
    const event = new MouseEvent('click', {
        view: window,
        bubbles: true,
        cancelable: true
    });
    element.dispatchEvent(event);
}

function recursiveLogin(preference) {
    checkLoginStatus(preference).then((isLoggedIn) => {
        if (isLoggedIn) {
            console.log("User is already logged in.");
        } else {
            console.log("User is not logged in. Starting login process...");

            chrome.storage.sync.get("email", (result) => {
                if (!clickLoginButton(preference, result.email)) {
                    console.log("Login button not found, retrying...");
                }
            });
        }
    });
}