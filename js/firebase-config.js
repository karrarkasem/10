// ╔══════════════════════════════════════════════════════════════╗
// ║   🔥 الفانوس للتوظيف — إعداد Firebase                      ║
// ╚══════════════════════════════════════════════════════════════╝

const firebaseConfig = {
  apiKey            : "AIzaSyBKlAEuk3QQJBqWqR1zmBdHGwasIW86Y-I",
  authDomain        : "karbala-b4884.firebaseapp.com",
  projectId         : "karbala-b4884",
  storageBucket     : "karbala-b4884.firebasestorage.app",
  messagingSenderId : "284387684367",
  appId             : "1:284387684367:web:ef4aa5b125ed695db4b37a"
};

try {
  firebase.initializeApp(firebaseConfig);
  window.auth    = firebase.auth();
  window.db      = firebase.firestore();
  window.storage = firebase.storage();

  db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED, merge: true });
  db.enablePersistence({ synchronizeTabs: true })
    .catch(err => { if (err.code !== 'failed-precondition' && err.code !== 'unimplemented') console.warn('Firestore offline:', err.code); });

  console.log('✅ Firebase initialized — الفانوس للتوظيف');
} catch (e) {
  window.FIREBASE_ERROR = true;
  console.warn('⚠️ Firebase error — Demo Mode active');
}
