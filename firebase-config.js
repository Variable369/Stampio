// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

const firebaseConfig = {
  apiKey: "AIzaSyCwPN1bBCcPr06M2R63Z0KfXI4eRXzZs2w",
  authDomain: "stampio-369.firebaseapp.com",
  projectId: "stampio-369",
  storageBucket: "stampio-369.firebasestorage.app",
  messagingSenderId: "142463856009",
  appId: "1:142463856009:web:f888f7acf5744fce07c558"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);