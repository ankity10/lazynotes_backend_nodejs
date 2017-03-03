 var request = require('request');

    request.get(
        'http://localhost:15672/api/queues/%2f/q1',
        function (error, response, body) {
            if (!error && response.statusCode == 200) {
                console.log(body)
            }
        }
    );