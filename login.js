// login.js
import { auth } from './firebase-config.js';
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username');
const passwordInput = document.getElementById('password');
const errorMessage = document.getElementById('error-message');

const userMap = {
    "admin": "admin@stampio.cz",
    "Uživatel1": "uzivatel1@stampio.cz"
};

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorMessage.style.display = 'none';

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    const email = userMap[username];

    if (!email) {
        errorMessage.textContent = "Neznámé uživatelské jméno.";
        errorMessage.style.display = 'block';
        return;
    }

    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = 'map.html';
    } catch (error) {
        console.error("Chyba při přihlášení: ", error);
        errorMessage.textContent = "Nespávné heslo nebo chyba přihlášení.";
        errorMessage.style.display = 'block';
    }
});