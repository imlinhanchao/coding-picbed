const request = require('./request');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const uuid = require('node-uuid');
const mime = require('mime');

let _options = {};
let user, project, repo, token, repository;

let setToken = t => token = t;

// is the repository open source 
async function isShare() {
    if (!token || !project) throw new Error('You have to initialize first!')

    let rsp = await request({
        api: `https://${user}.coding.net/api/user/${user}/project/${project}/depot/${repo}/git`,
        token,
    });

    return rsp.data.depot.shared
}

async function getPageUrl() {
    if (!token || !project) throw new Error('You have to initialize first!')

    let sites = await request({
        api: `https://${user}.coding.net/api/user/${user}/project/${project}/autodeploy/static-sites`,
        token,
    });

    if (!sites.data) return [];

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
        if (lastDeploy.depot_name == repo) return pages.data.available_addresses
    }
    return [];
}

async function upload(file, name) {
    if (!token || !project) throw new Error('You have to initialize first!')

    let api = `https://${user}.coding.net/api/user/${user}/project/${project}/depot/${repo}/git/upload/master/`;
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
    let boundaryKey = '----WebKitFormBoundary' + uuid.v4(); 
    rsp = await request({
        api, token, headers: {
            'Content-Type': 'multipart/form-data; boundary=' + boundaryKey
        }, method: 'POST',
        write(req) {
            req.write(
                `--${boundaryKey}\r
Content-Disposition: form-data; name="message"\r
\r
${data.message}\r
\r
--${boundaryKey}\r
Content-Disposition: form-data; name="lastCommitSha"\r
\r
${data.lastCommitSha}\r
--${boundaryKey}\r
Content-Disposition: form-data; name="newRef"\r
\r
\r
--${boundaryKey}\r
Content-Disposition: form-data; name="${name}"; filename="${name}"\r
Content-Type: ${mime.getType(file)}\r
\r
`);
        
            let fileStream = fs.createReadStream(file);
            fileStream.pipe(req, { end: false });
            fileStream.on('end', function() {
                req.end('\r\n--' + boundaryKey + '--');
            });
        }
    });
    return rsp
}

async function config({
    token, repository
}) {
    setToken(token);
    if (repository == null) return;
    if (repository.slice(-1) == '/') repository += '/';
    if (repository.search(/https:\/\/([^.]*?).coding.net\/p\/([^\/]*?)\//) < 0) throw new Error('Invalid repository URL!');

    let mat = repository.match(/https:\/\/([^.]*?).coding.net\/p\/([^\/]*?)\/d\/([^\/]*?)\//);
    if (!mat) mat = repository.match(/https:\/\/([^.]*?).coding.net\/p\/([^\/]*?)\//);

    user = mat[1];
    project = mat[2];
    repo = mat[3] || project;

    _options.domains = null;
    _options.isShare = await isShare()
    _options.domains = await getPageUrl();

    if (!_options.isShare && _options.domains.length == 0) throw new Error('The repository must be setting static website or open source.')
}

async function exist(filename) {
    
    let rsp = await request({
        api: `https://${user}.coding.net/api/user/${user}/project/${project}/depot/${repo}/git/blob/master/${filename}`,
        token,
    });

    return !!rsp.data.file;
}

function hash(buffer) {
    let sha256 = crypto.createHash('sha256');
    let hash = sha256.update(buffer).digest('hex');
    return hash;
}

let interface = {
    async upload(filepath, filename) {
        filename = filename || (hash(fs.readFileSync(filepath)) + path.extname(filepath));
        if (!await exist(filename)) {
            let rsp = await upload(filepath, filename);
            if (rsp.code == 1216) return this.upload(filepath, filename);
            if (rsp.code != 1217 // file exist
                && rsp.code != 0) throw new Error(`Upload file failed(${rsp.code}): ${rsp.msg[Object.keys(rsp.msg)[0]] || 'Unknown Error'}.`);
        }
        return {
            filename,
            urls: [
                ..._options.domains.map(d => `http://${d}/${filename}`),
                ...(_options.isShare ? [`https://${user}.coding.net/p/${project}/d/${repo}/git/raw/master/${filename}`] : [])
            ]
        }
          
    },
    isInitialized() {
        return !!_options.domains
    },
    config
}

function initialize ({
    token = null,
    repository = null,
}) {
    if (token && repository) config({ token, repository });
    return interface;
}

module.exports = Object.assign(initialize, interface);