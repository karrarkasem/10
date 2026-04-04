// ╔══════════════════════════════════════════════════════════════╗
// ║   🔥 الفانوس للتوظيف — إعداد Firebase                      ║
// ║   1. اذهب إلى https://console.firebase.google.com          ║
// ║   2. أنشئ مشروعاً → أضف تطبيق ويب → انسخ firebaseConfig   ║
// ╚══════════════════════════════════════════════════════════════╝

const firebaseConfig = {
  apiKey            : "AIzaSy_YOUR_API_KEY_HERE",
  authDomain        : "your-project-id.firebaseapp.com",
  projectId         : "your-project-id",
  storageBucket     : "your-project-id.appspot.com",
  messagingSenderId : "123456789012",
  appId             : "1:123456789012:web:abcdef1234567890"
};

try {
  firebase.initializeApp(firebaseConfig);
  window.auth    = firebase.auth();
  window.db      = firebase.firestore();
  window.storage = firebase.storage();

  db.settings({ cacheSizeBytes: firebase.firestore.CACHE_SIZE_UNLIMITED });
  db.enablePersistence({ synchronizeTabs: true })
    .catch(err => console.warn('Firestore offline:', err.code));

  console.log('✅ Firebase initialized — الفانوس للتوظيف');
} catch (e) {
  window.FIREBASE_ERROR = true;
  console.warn('⚠️ Firebase config not set — Demo Mode active');
}
