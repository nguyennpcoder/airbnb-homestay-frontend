import { initializeApp, getApps, FirebaseApp } from 'firebase/app';

const firebaseConfig = {
  apiKey: "AIzaSyCaivkKMpbH6_raCkVB1j2rWJYFSJ_da7k",
  authDomain: "airbnb-nguyennpcoder.firebaseapp.com",
  projectId: "airbnb-nguyennpcoder",
  storageBucket: "airbnb-nguyennpcoder.firebasestorage.app",
  messagingSenderId: "416756861402",
  appId: "1:416756861402:web:e2c4ed847f74f93c5098e3",
  measurementId: "G-B8T16MCK71"
};

let app: FirebaseApp;

try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.error('❌ Firebase initialization error:', error);
  // If initialization failed, try to get existing app
  app = getApps()[0];
}

export const firebaseApp = app;