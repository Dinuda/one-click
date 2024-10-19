document.addEventListener(
  "keydown",
  debounce((event) => {
    if (event.metaKey && event.code === "KeyJ") {
      console.log("Command + B detected. Triggering login process.");
      startLoginProcess();
    }
  }, 300)
); // Debounce added with 300ms delay

// Prevent window.open from opening new tabs/windows
window.open = function () {
  console.log("window.open is disabled to prevent opening new tabs.");
};

// Override link clicks with target="_blank" or JS calls attempting to open new windows
const observer = new MutationObserver(function (mutationsList) {
  mutationsList.forEach((mutation) => {
    if (mutation.type === "childList") {
      mutation.addedNodes.forEach((node) => {
        if (node.tagName && node.tagName.toLowerCase() === "a") {
          node.removeAttribute("target"); // Remove target="_blank"
        }
      });
    }
  });
});

// Start observing the document for any new links being added
observer.observe(document.body, { childList: true, subtree: true });

var email = null;

function startLoginProcess() {
  try {
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
  } catch (error) {
    console.log("An error occurred while starting the login process.");
    
    // prompt user to set email
    chrome.action.openPopup();
  }
}

function checkLoginStatus(preference) {
  return new Promise((resolve) => {
    try {
      if (preference === "google") {
        chrome.cookies.get(
          { url: "https://accounts.google.com", name: "SID" },
          (cookie) => {
            if (cookie) {
              console.log("Google login detected (SID cookie found).");
              resolve(true);
            } else {
              console.log(
                "Google SID cookie not found, user may not be logged in."
              );
              resolve(false);
            }
          }
        );
      } else if (preference === "facebook") {
        chrome.cookies.get(
          { url: "https://www.facebook.com", name: "c_user" },
          (cookie) => {
            if (cookie) {
              console.log("Facebook login detected (c_user cookie found).");
              resolve(true);
            } else {
              console.log(
                "Facebook c_user cookie not found, user may not be logged in."
              );
              resolve(false);
            }
          }
        );
      } else {
        resolve(false);
      }
    } catch (error) {
      resolve(false);
    }
  });
}

function findBestLoginButton(preference, email) {
  const loginKeywords = [
    "login",
    "log in",
    "signin",
    "sign in",
    "sign-in",
    "continue",
    "register",
    "create account",
    "sign up",
    "signup",
  ];

  const socialLoginKeywords = {
    google: [
      "google",
      "sign in with google",
      "continue with google",
      "google login",
      "join with google",
    ],
    facebook: [
      "facebook",
      "sign in with facebook",
      "continue with facebook",
      "facebook login",
      "join with facebook",
    ],
  };

  const chooseAccountKeywords = [
    "choose an account",
    "select an account",
    "select account",
    "choose account",
  ];

  const allKeywords = [...loginKeywords, ...chooseAccountKeywords];
  if (preference && socialLoginKeywords[preference]) {
    allKeywords.push(...socialLoginKeywords[preference]);
  }

  // Create a regex pattern from all keywords
  const keywordPattern = new RegExp(allKeywords.join("|"), "i");

  // First, scan the entire document's text content
  const docText = document.body.innerText.toLowerCase();
  if (!keywordPattern.test(docText)) {
    console.log("No relevant keywords found on the page.");
    return { bestElement: null, secondBestElement: null };
  }

  // If keywords are found, then search for specific elements
  const elements = document.querySelectorAll(
    "button, input[type='button'], input[type='submit'], a, span"
  );

  let bestElement = null;
  let secondBestElement = null;
  let bestScore = -Infinity;
  let secondBestScore = -Infinity;

  elements.forEach((element) => {
    const text = element.innerText.trim().toLowerCase();
    const ariaLabel = (element.getAttribute("aria-label") || "")
      .trim()
      .toLowerCase();
    const title = (element.getAttribute("title") || "").trim().toLowerCase();
    const value = (element.getAttribute("value") || "").trim().toLowerCase();
    const placeholder = (element.getAttribute("placeholder") || "")
      .trim()
      .toLowerCase();
    const name = (element.getAttribute("name") || "").trim().toLowerCase();
    const id = (element.getAttribute("id") || "").trim().toLowerCase();
    const className = (element.getAttribute("class") || "")
      .trim()
      .toLowerCase();
    const identifier = (element.getAttribute("data-email") || "")
      .trim()
      .toLowerCase();

    const attributes = [
      text,
      ariaLabel,
      title,
      value,
      placeholder,
      name,
      id,
      className,
      identifier,
    ];
    const allText = attributes.join(" ");

    // Only process elements that contain at least one keyword
    if (!keywordPattern.test(allText)) {
      return;
    }

    let score = 0;

    // Ignore hidden elements
    if (
      className.includes("hidden") ||
      window.getComputedStyle(element).display === "none"
    ) {
      return;
    }

    // Score calculation
    allKeywords.forEach((keyword) => {
      if (allText.includes(keyword)) {
        score += keyword.length; // Longer, more specific keywords get higher scores
      }
    });

    // Email Match for Identifying Users
    if (email === identifier) score += 100;

    // Size Heuristics (Favor smaller elements)
    const rect = element.getBoundingClientRect();
    const area = rect.width * rect.height;
    if (area > 0 && area <= 5000) {
      score += (5000 - area) / 100;
    } else {
      score -= 50;
    }

    // Clickability Heuristics
    if (
      element.onclick ||
      element.tagName.toLowerCase() === "button" ||
      (element.tagName.toLowerCase() === "input" &&
        ["button", "submit"].includes(element.type.toLowerCase()))
    ) {
      score += 20;
    } else if (element.tagName.toLowerCase() === "a") {
      score += 5;
    }

    // Update best and second-best elements
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
  const { bestElement, secondBestElement } = findBestLoginButton(
    preference,
    email
  );

  if (bestElement) {
    simulateClick(bestElement);
    console.log("Clicked the best matching login button:", bestElement);
  }

  if (secondBestElement) {
    simulateClick(secondBestElement);
    console.log(
      "Clicked the second best matching login button:",
      secondBestElement
    );
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
  const event = new MouseEvent("click", {
    view: window,
    bubbles: true,
    cancelable: true,
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
