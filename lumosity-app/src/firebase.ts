// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA6ih1W6qYILEIEs-c-K4UWTmNd36vQE54",
  authDomain: "ygy117.firebaseapp.com",
  projectId: "ygy117",
  storageBucket: "ygy117.firebasestorage.app",
  messagingSenderId: "550313715467",
  appId: "1:550313715467:web:633493b601c6ea0927e40e",
  measurementId: "G-DPXBBJQ462"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
export default app;
