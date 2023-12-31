import * as admin from 'firebase-admin';
admin.initializeApp({
  projectId: process.env.GOOGLE_CLOUD_PROJECT,
  databaseURL: 'https://sign-mt-default-rtdb.firebaseio.com/',
});

import * as functions from 'firebase-functions';
import {prerenderFunctions} from './prerender/controller';
import {textToTextFunctions} from './text-to-text/controller';
import {logConsoleMemory} from './utils/memory';
import {FirebaseDatabase} from '@firebase/database-types';

logConsoleMemory(process.env.NODE_ENV === 'production' ? functions.logger : console);

const database = <FirebaseDatabase>admin.database();
const storage = admin.storage() as any;

module.exports = {
  translate: {
    prerender: prerenderFunctions(),
    textToText: textToTextFunctions(database, storage),
  },
};
