const crypto = require('crypto');
const test = require('tape');
const path = require('path');
const fs = require('fs');

const options = {
    token: 'b86a0840ccc3a072dc07961826137b0a70765d15',
    repository: 'https://imlinhanchao.coding.net/p/demo/',
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

    const coding = require('.')(options);

    console.log('wait for init.');
    while (!coding.isInitialized()) await sleep(100);
    
    let filepath = path.resolve(__dirname, 'readme.md')
    
    test('Upload readme to repository', async function(assert) {
        assert.deepEqual((await coding.upload(filepath)).filename,
            hash(fs.readFileSync(filepath)) + '.md');
        assert.end()
    })

})()

