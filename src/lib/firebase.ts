import { initializeApp, getApps, getApp } from "firebase/app";

import { getFirestore } from "firebase/firestore";

import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBZNSjCBVEXGHHioabuw7llkfQveaQ5QuA",
  authDomain: "project-23415fac-67ed-4359-b4f.firebaseapp.com",
  projectId: "project-23415fac-67ed-4359-b4f",
  storageBucket: "project-23415fac-67ed-4359-b4f.firebasestorage.app",
  messagingSenderId: "702299985934",
  appId: "1:702299985934:web:b88c0206f9099c2652c45f",
  measurementId: "G-VHM3PVNY8B",
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const db = getFirestore(app);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence)
  .then(() => {
    console.log("Persistência ativada");
  })
  .catch((error) => {
    console.error(error);
  });