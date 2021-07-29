document.addEventListener('DOMContentLoaded', () => {
    if('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/service-worker.js')
            .then((reg) => {
                console.log(`Service worker registered --> ${reg}`);
                console.log('__dirname');
                if (!navigator.online) {
                    reg.update();
                }
            }, (err) => { 
                console.error(`Service worker not registered --> ${err}`);
            })

        navigator.serviceWorker.ready.then(function (registration) {
            console.log('Service Worker Ready in ready function.')
            return registration.sync.register('sendFormData')
        }).then(function () {
            console.log('sync event registered')
        }).catch(function () {
            // system was unable to register for a sync,
            // this could be an OS-level restriction
            console.log('sync registration failed')
        });
          
        // Listen for message from service worker
      //  navigator.serviceWorker.addEventListener('message', () => { });
        
    } 
}, false);