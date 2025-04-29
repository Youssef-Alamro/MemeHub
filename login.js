document.addEventListener('DOMContentLoaded', () => {
    // Dark mode toggle
    const darkModeToggle = document.getElementById('darkModeToggle');
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check local storage for dark mode preference
    const currentTheme = localStorage.getItem('theme');
    if (currentTheme === 'dark') {
        document.body.setAttribute('data-dark-mode', 'true');
        darkModeToggle.setAttribute('aria-pressed', 'true');
    } else if (currentTheme === 'light') {
        document.body.setAttribute('data-dark-mode', 'false');
        darkModeToggle.setAttribute('aria-pressed', 'false');
    } else if (prefersDarkScheme.matches) {
        document.body.setAttribute('data-dark-mode', 'true');
        darkModeToggle.setAttribute('aria-pressed', 'true');
    }
    
    darkModeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-dark-mode') === 'true';
        document.body.setAttribute('data-dark-mode', !isDark);
        darkModeToggle.setAttribute('aria-pressed', !isDark);
        localStorage.setItem('theme', isDark ? 'light' : 'dark');
    });

    // Tab switching logic
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all buttons and panes
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanes.forEach(pane => pane.classList.remove('active'));
            
            // Add active class to clicked button and corresponding pane
            button.classList.add('active');
            const tabId = button.getAttribute('data-tab');
            document.getElementById(`${tabId}-tab`).classList.add('active');
            
            // Clear error and success messages
            document.getElementById('errorMessage').style.display = 'none';
            document.getElementById('successMessage').style.display = 'none';
        });
    });

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    const errorMessage = document.getElementById('errorMessage');
    const successMessage = document.getElementById('successMessage');
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        try {
            await firebase.auth().signInWithEmailAndPassword(email, password);
            successMessage.textContent = 'Succesvol ingelogd! Je wordt doorgestuurd...';
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';
            
            // Redirect to home page after successful login
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1500);
        } catch (error) {
            console.error('Inlogfout:', error);
            errorMessage.textContent = `Inloggen mislukt: ${error.message}`;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        }
    });

    // Registration form submission
    const registerForm = document.getElementById('registerForm');
    
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const username = document.getElementById('registerUsername').value;
        const email = document.getElementById('registerEmail').value;
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        // Simple validation
        if (password !== confirmPassword) {
            errorMessage.textContent = 'Wachtwoorden komen niet overeen.';
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
            return;
        }
        
        try {
            // Create user in Firebase Auth
            const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
            const user = userCredential.user;
            
            // Add user to Firestore database
            await usersCollection.doc(user.uid).set({
                username: username,
                email: email,
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            successMessage.textContent = 'Account aangemaakt! Je wordt doorgestuurd...';
            successMessage.style.display = 'block';
            errorMessage.style.display = 'none';
            
            // Redirect to home page after successful registration
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 1500);
        } catch (error) {
            console.error('Registratiefout:', error);
            errorMessage.textContent = `Registratie mislukt: ${error.message}`;
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
        }
    });

    // Forgot password link
    const forgotPasswordLink = document.getElementById('forgotPasswordLink');
    
    forgotPasswordLink.addEventListener('click', (e) => {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        
        if (!email) {
            errorMessage.textContent = 'Vul je e-mailadres in om je wachtwoord te resetten.';
            errorMessage.style.display = 'block';
            successMessage.style.display = 'none';
            return;
        }
        
        firebase.auth().sendPasswordResetEmail(email)
            .then(() => {
                successMessage.textContent = 'E-mail voor wachtwoordreset is verzonden. Controleer je inbox.';
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';
            })
            .catch((error) => {
                console.error('Wachtwoordreset fout:', error);
                errorMessage.textContent = `Wachtwoordreset mislukt: ${error.message}`;
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
            });
    });

    // Check if user is already logged in
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is already logged in, redirect to home page
            window.location.href = '/index.html';
        }
    });
});
