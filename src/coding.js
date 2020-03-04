const request = require('./request');
const crypto = require('crypto');
const fs = require('fs');

module.exports = function ({
    token = null,
    user = null,
    project = null,
    repository = null,
}) {
    repository = repository || project
    project = project || repo

    // is the repository open source 
    async function isShare() {

        let rsp = await request({
            api: `https://${user}.coding.net/api/user/${user}/project/${project}/depot/${repository}/git`,
            token,
        });

        return rsp.shared
    }
}