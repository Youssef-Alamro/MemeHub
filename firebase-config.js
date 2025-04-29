// Firebase configuratie
const firebaseConfig = {
    apiKey: "AIzaSyAFzz581VDFsViMBhO3btCQU_0JYCTh2mU",
    authDomain: "memehub-c311a.firebaseapp.com",
    databaseURL: "https://memehub-c311a-default-rtdb.firebaseio.com",
    projectId: "memehub-c311a",
    storageBucket: "memehub-c311a.firebasestorage.app",
    messagingSenderId: "149350797648",
    appId: "1:149350797648:web:5ddb4ce9fd2b0f4b771c55",
    measurementId: "G-DGLCFV39L6"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const memeCollection = db.collection('memes');
const likesCollection = db.collection('likes');
const usersCollection = db.collection('users');
