const request = require('./request');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const uuid = require('node-uuid');
const mime = require('mime');

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

        return rsp.data.depot.shared
    }

    async function getPageUrl() {
        let sites = await request({
            api: `https://${user}.coding.net/api/user/${user}/project/${project}/autodeploy/static-sites`,
            token,
        });
        let data = {};
        if (!sites.data) return data;
        sites = sites.data;
        for (let i = 0; i < sites.list.length; i++) {
            let l = sites.list[i];
            let id = l.id;
            let pages = await request({
                api: `https://${user}.coding.net/api/user/${user}/project/${project}/autodeploy/static-sites/${id}`,
                token,
            })
            let deploys = await request({
                api: `https://${user}.coding.net/api/user/${user}/project/${project}/autodeploy/static-sites/${id}/tasks?page=1&page_size=10`,
                token,
            });
            let lastDeploy = deploys.data.list[deploys.data.list.length - 1];
            data[lastDeploy.depot_name] = pages.data.available_addresses
        }
        return data;
    }

    async function upload(file, name) {
        let api = `https://${user}.coding.net/api/user/${user}/project/${project}/depot/${repository}/git/upload/master/`;
        let rsp = await request({
            api, token,
        });
        name = name || path.basename(file)
        let lastCommitSha = rsp.data.lastCommit;
        let data = {
            message: '上传文件',
            lastCommitSha,
            newRef: ''
        };
        let boundaryKey = '------WebKitFormBoundary' + uuid.v4(); 
        rsp = await request({
            api, token, headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            write (req) {
                req.write(
                    `${boundaryKey} 
Content-Disposition: form-data; name="message"; 

${data.message}

${boundaryKey} 
Content-Disposition: form-data; name="lastCommitSha"

${data.lastCommitSha}
${boundaryKey} 
Content-Disposition: form-data; name="newRef"


${boundaryKey} 
Content-Disposition: form-data; name="${name}"; filename="${name}"
Content-Type: ${mime.getType(file)}`);
            
                let fileStream = fs.createReadStream(file);
                fileStream.pipe(req, { end: false });
                fileStream.on('end', function() {
                    req.end(boundaryKey + '--');
                });
            }
        });
        return rsp
    }

    return {
        isShare,
        getPageUrl,
        upload
    }
}