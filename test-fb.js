import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, setDoc, doc } from "firebase/firestore";
import fs from "fs";
const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId || '(default)');

async function run() {
  try {
    await setDoc(doc(db, "test", "test"), { a: 1 });
    console.log("Write success");
    const docs = await getDocs(collection(db, "test"));
    console.log("Read success, docs:", docs.docs.length);
  } catch (e) {
    console.error("Error", e);
  }
}
run();
