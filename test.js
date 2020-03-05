const test = require('tape');
const path = require('path');
const crypto = require('crypto');

const options = {
    token: '',
    repository: ''
};

if (options.token == '' || options.repository == '') {
    throw new Error('Please Edit file to config options first.');
}

function sleep (time) {
    return new Promise((resolve) => setTimeout(resolve, time));
}

function hash(buffer) {
    let sha256 = crypto.createHash('sha256');
    let hash = sha256.update(buffer).digest('hex');
    return hash;
}

(async () => {

    const github = require('.')({
        token: options.token,
        repository
    });

    console.log('wait for init.');
    while (!github.isInitialized()) await sleep(100);
    
    let filepath = path.resolve(__dirname, 'readme.md')
    
    test('Upload readme to repository', async function(assert) {
        assert.deepEqual((await github.upload(filepath)).filename,
            hash(fs.readFileSync(filepath)));
        assert.end()
    })

})()

