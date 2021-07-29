// const BUDGETCACHE = "V3"
let BUDGETCACHE = "V3";
let DATACACHE = "apicache1"

let form_data;
let our_db;
const STORE_NAME = 'post_requests'

const toCache = [
    '/',
    '/index.html',
    '/index.js',
    '/offline.js',
    '/styles.css',
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
]

// Install a service worker
self.addEventListener('install', (event) => {
    event.waitUntil(
      caches.open(BUDGETCACHE)
      .then((cache) => {
        self.addEventListener('load', (event) => {
          console.log('BUDGETCACHE!!!!!!!!')
        });
        return cache.addAll(toCache);
      })
      // .then((result) => { 
      //   self.skipWaiting();
      // })
      .catch((err) => {
        console.log(err);
       })
    );
  });

// Create indexedDB Database
function openDatabase() {
  const IDB_VERSION = 1;
  const indexedDBOpenRequest = indexedDB.open('budget-tracker-form',
    IDB_VERSION)

  indexedDBOpenRequest.onerror = function (error) {
    // error creating db
    console.error('IndexedDB error:', error)
  }

  indexedDBOpenRequest.onupgradeneeded = function () {
    let db = indexedDBOpenRequest.result;
    db.createObjectStore(STORE_NAME, {
      autoIncrement: true, keyPath: 'id'
    })
  }

  // This will execute each time the database is opened.
  indexedDBOpenRequest.onsuccess = function () {
    our_db = indexedDBOpenRequest.result;
  }
}

openDatabase()

// Cache and return requests
self.addEventListener("fetch", function (event) {
  if (event.request.method === 'GET') {
    if (event.request.url.includes("/api/")) {
      event.respondWith(
        caches
          .open(DATACACHE)
          .then((cache) => {
            return fetch(event.request)
              .then((response) => {
                // If the response was good, clone it and store it in the cache.
                if (response.status === 200) {
                  cache.put(event.request.url, response.clone());
                }

                return response;
              })
              .catch((err) => {
                // Network request failed, try to get it from the cache.
                return cache.match(event.request);
              });
          })
          .catch((err) => console.log(err))
      );
      return;
    }
    else {
      event.respondWith((async () => {
        const res = await caches.match(event.request);
        if (res) { return res; }

        const response2 = await fetch(event.request);
        const cache = await caches.open(BUDGETCACHE);
        cache.put(event.request, response2.clone());
        return response2;
      })())
    }
  } 
  else if (event.request.clone().method === 'POST') {
    event.respondWith(fetch(event.request.clone())
      .catch(function (error) {
        console.log('event.request.clone().url::', event.request.clone().url);
        savePostRequests(event.request.clone().url, form_data)
      }))
  }
});

// Used to Delete old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (key !== BUDGETCACHE) {
          return caches.delete(key);
        }
      }));
    })
  );
});


self.addEventListener('message', function (event) {
  console.log('form data sent to SW', event.data)
  if (event.data.hasOwnProperty('form_data')) {
    // receives form data from script.js upon submission
    console.log('Form data into SW: ', event.data);
    form_data = event.data.form_data
  }
})

self.addEventListener('sync', function (event) {
  console.log('now online')
  if (event.tag === 'sendFormData') { // event.tag name checked
    // here must be the same as the one used while registering
    // sync
    event.waitUntil(
      sendPostToServer()
    )
  }
})

function sendPostToServer () {
  var savedRequests = []
  var req = getObjectStore(STORE_NAME).openCursor() // FOLDERNAME
  // is 'post_requests'
  req.onsuccess = async function (event) {
    var cursor = event.target.result
   if (cursor) {
    // Keep moving the cursor forward and collecting saved
    // requests.
    savedRequests.push(cursor.value)
      cursor.continue()
   } else {
     // At this point, we have collected all the post requests in
     // indexedb.
     for (let savedRequest of savedRequests) {
       // send them to the server one after the other
       console.log('saved request', savedRequest)
       var requestUrl = savedRequest.url
       var payload = JSON.stringify(savedRequest.payload)
       var method = savedRequest.method
       var headers = {
         'Accept': 'application/json',
         'Content-Type': 'application/json'
       } // if you have any other headers put them here
       fetch(requestUrl, {
         headers: headers,
         method: method,
         body: payload
       }).then(function (response) {
         console.log('server response', response)
         if (response.status < 400) {
          // If sending the POST request was successful, then
          // remove it from the IndexedDB.
           getObjectStore(STORE_NAME,
             'readwrite').delete(savedRequest.id)
         } 
      }).catch(function (error) {
         // This will be triggered if the network is still down. 
        // The request will be replayed again
       // the next time the service worker starts up.
       console.error('Send to Server failed:', error)
        // since we are in a catch, it is important an error is
        //thrown,so the background sync knows to keep retrying 
        // the send to server
        throw error
      })
     }
    }
  }
}


function getObjectStore(storeName, mode) {
  // retrieve our object store
  return our_db.transaction(storeName, mode
  ).objectStore(storeName)
}

function savePostRequests(url, payload) {
  // get object_store and save our payload inside it
  var request = getObjectStore(STORE_NAME, 'readwrite').add({
    url: url,
    payload: payload,
    method: 'POST'
  })
  request.onsuccess = function (event) {
    console.log('a new pos_ request has been added to indexedb')
  }
  request.onerror = function (error) {
    console.error(error)
  }
}
