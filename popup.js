document.addEventListener('DOMContentLoaded', function () {
    const statusDiv = document.getElementById('status');

    // Function to load the current preference from Chrome storage
    function loadPreference(callback) {
        chrome.storage.sync.get('preference', function (data) {
            console.log(data);
            if (data.preference) {
                statusDiv.textContent = `Current preference: ${data.preference}`;
            } else {
                statusDiv.textContent = 'No preference set';
            }
            callback(data.preference);  // Pass the preference to the callback function
        });
    }

    // Initialize the page by loading the preference
    loadPreference(function (preference) {
        console.log("Loaded preference: ", preference);
    });

    const googleButton = document.getElementById('googleLogin');
    const facebookButton = document.getElementById('facebookLogin');
    const emailInput = document.getElementById('defaultEmail');
    const emailError = document.getElementById('emailError');
    const saveButton = document.getElementById('saveSettings');
    const formFeedback = document.getElementById('formFeedback');

    let selectedProvider = null;

    function updateSaveButtonState() {
        if (selectedProvider) {
            saveButton.classList.add('active');
            saveButton.style.cursor = 'pointer';
            saveButton.style.opacity = '1';
        } else {
            saveButton.classList.remove('active');
            saveButton.style.cursor = 'not-allowed';
            saveButton.style.opacity = '0.5';
        }
    }

    function selectProvider(provider, otherProvider) {
        provider.classList.add('selected');
        otherProvider.classList.remove('selected');

        selectedProvider = provider;
        updateSaveButtonState();
        formFeedback.textContent = '';
    }

    googleButton.addEventListener('click', () => selectProvider(googleButton, facebookButton));
    facebookButton.addEventListener('click', () => selectProvider(facebookButton, googleButton));

    function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
    }

    function validateForm() {
        emailError.textContent = '';

        const email = emailInput.value.trim();
        if (email && !validateEmail(email)) {
            emailError.textContent = 'Please enter a valid email address.';
            return false;
        }

        return true;
    }

    emailInput.addEventListener('input', function () {
        if (this.value.trim()) {
            emailError.textContent = '';
        }
    });

    saveButton.addEventListener('click', function () {
        if (validateForm()) {
            const email = emailInput.value.trim() || 'No email provided';
            formFeedback.textContent = 'Settings saved successfully!';
            formFeedback.classList.remove('error');
            formFeedback.classList.add('success');

            let providerName = selectedProvider.id === 'googleLogin' ? 'google' : 'facebook';

            // Save settings to cookies
            document.cookie = `preference=${providerName}; path=/; max-age=31536000; SameSite=None; Secure`;
            document.cookie = `email=${email}; path=/; max-age=31536000; SameSite=None; Secure`;

            // Save preference to Chrome storage
            chrome.storage.sync.set({ preference: providerName }, function () {
                console.log('Settings saved:', {
                    provider: providerName,
                    email
                });
            });

            chrome.storage.sync.set({ email: email }, function () {
                console.log('Settings saved:', {
                    provider: providerName,
                    email
                });
            });
        } else {
            formFeedback.textContent = 'Please fix the errors above and try again.';
            formFeedback.classList.remove('success');
            formFeedback.classList.add('error');
        }
    });
});