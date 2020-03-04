const https = require('https');

module.exports = function ({
    api,
    token,
    data = null,
    method = 'GET'
}) {
    let hostname = new URL(api).hostname;
    let path = new URL(api).pathname;
    return new Promise((resolve, reject) => {

        var options = {
            hostname: hostname,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'token ' + token,
                'User-Agent': 'Coding-PicBad-App'
            }
        };

        let req = https.request(options, (res) => {
            let body = '';

            res.setEncoding('utf8');

            res.on('data', (data) => {
                body += data;
            });
            
            res.on('end', () => {
                try {
                    resolve(JSON.parse(body))
                } catch (_) {
                    resolve(body);
                }
            });
        });

        req.on('error', function (e) {
            reject(e);
        });

        if(data) req.write(JSON.stringify(data));

        req.end();
    });
}