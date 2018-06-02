var request = require('request');

function syncLog() {
    return new Promise(function(resolve, reject){
        request.post(
            'http://194.210.91.146:3001/newLog'
        )
    });
}

syncLog();