/* =====================================================================
   Firebase সংযোগ — সব ডিভাইসে অগ্রগতি সিঙ্ক করার জন্য
   ---------------------------------------------------------------------
   ফাঁকা রাখলে অ্যাপ পুরোপুরি চলবে, শুধু ক্লাউড সিঙ্ক বন্ধ থাকবে
   (অগ্রগতি তখন শুধু ওই ডিভাইসেই থাকে)।

   চালু করতে (একবারই):
   1. console.firebase.google.com → নতুন প্রজেক্ট → Web app যোগ করো (</>)
      → যে firebaseConfig দেখাবে, তার মানগুলো নিচে বসাও।
   2. Build → Authentication → Sign-in method → "Google" ও "Email/Password" চালু করো।
      Settings → Authorized domains-এ অ্যাপের ডোমেইন যোগ করো
      (যেমন: তোমার-নাম.github.io)।
   3. Build → Firestore Database → Create database (production mode)।
      Rules ট্যাবে এই প্রজেক্টের firestore.rules ফাইলের লেখা বসিয়ে Publish করো।
   4. নতুন ফাইল আপলোডের পর sw.js-এ VERSION বাড়াও, যাতে সব ডিভাইস নতুনটা পায়।

   apiKey গোপন তথ্য নয় — Firebase-এর নিয়ম অনুযায়ী এটি ওয়েব অ্যাপে প্রকাশ্যেই থাকে।
   নিরাপত্তা আসে firestore.rules থেকে: প্রত্যেক ব্যবহারকারী শুধু নিজের ডেটা পড়তে/লিখতে পারে।
   ===================================================================== */
window.FIREBASE_CONFIG = {
  apiKey: "AIzaSyDyOgej4J0TwqCpWLcMVCxc5axZSpmZzqk",
  authDomain: "e-gp-73feb.firebaseapp.com",
  projectId: "e-gp-73feb",
  storageBucket: "e-gp-73feb.firebasestorage.app",
  messagingSenderId: "900028088450",
  appId: "1:900028088450:web:69ece44edae3a4ce82749b",
};
