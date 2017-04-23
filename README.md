# monkey-cymbal-web
A project of a servo actuated monkey cymbal, with a web interface qhich also shows a graph of the room temperature. backend in firebase

## intallation

got to https://firebase.google.com/docs/server/setup and get the service account for your project , save it and replace the file serviceAccountCredentials.json also change the databaseURL

update the field databaseURL in the index.js in order to point to your app

update the web/config.firebase.js with firebase client configuration