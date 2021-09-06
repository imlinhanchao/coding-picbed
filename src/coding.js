const request = require('./request');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const uuid = require('node-uuid');
const mime = require('mime');

class Coding
{
    constructor(config = {
        token: null,
        repository: null,
    }) {
        if (config.token && config.repository) this.config(config);
    }

    isInitialized() {
        return !!this.domains
    }

    async upload(filepath, dir, filename) {
        filename = filename || (hash(fs.readFileSync(filepath)) + path.extname(filepath));
        dir = dir.replace(/^\/|\/$/, '');
        let savepath = dir + '/' + filename;
        savepath = savepath.replace(/^\/|\/$/, '');
        if (!await this.exist(savepath)) {
            let rsp = await this._upload(filepath, dir, filename);
            if (rsp.code == 1216) return this.upload(filepath, filename);
            if (rsp.code != 1217 // file exist
                && rsp.code != 0) throw new Error(`Upload file failed(${rsp.code}): ${rsp.msg[Object.keys(rsp.msg)[0]] || 'Unknown Error'}.`);
        }
        return {
            filename,
            urls: [
                ...this.domains.map(d => `http://${d}/${savepath}`),
                ...(this.isShare ? [`https://${this.user}.coding.net/p/${this.project}/d/${this.repo}/git/raw/master/${savepath}`] : [])
            ]
        }
          
    }

    async config({ token, repository }) {
        if (repository == null) return;
        if (repository.slice(-1) != '/') repository += '/';
        if (repository.search(/https:\/\/([^.]*?).coding.net\/p\/([^\/]*?)\//) < 0) throw new Error('Invalid repository URL!');
    
        let mat = repository.match(/https:\/\/([^.]*?).coding.net\/p\/([^\/]*?)\/d\/([^\/]*?)\//);
        if (!mat) mat = repository.match(/https:\/\/([^.]*?).coding.net\/p\/([^\/]*?)\//);
    
        this.token = token;
        this.user = mat[1];
        this.project = mat[2];
        this.repo = mat[3] || this.project;
    
        this.isShare = await this._isShare()
        this.domains = [];
    
        if (!this.isShare)
            throw new Error('The repository must be open source.')    
    }

    async exist(filename) {
        if (!this.token || !this.project) throw new Error('You have to initialize first!')

        let rsp = await request({
            api: `https://${this.user}.coding.net/api/user/${this.user}/project/${this.project}/depot/${this.repo}/git/blob/master/${filename}`,
            token: this.token,
        });
    
        if (rsp.code) throw new Error(rsp.msg[Object.keys(rsp.msg)[0]] || 'Unknown Error');

        return !!rsp.data.file;
    }
    
    async _upload(file, dir, name) {
        if (!this.token || !this.project) throw new Error('You have to initialize first!')
    
        let api = `https://${this.user}.coding.net/api/user/${this.user}/project/${this.project}/depot/${this.repo}/git/upload/master/${dir}`;
        let rsp = await request({
            api, token: this.token,
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
            api, token: this.token, headers: {
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
\r\n`);
            
                let fileStream = fs.createReadStream(file);
                fileStream.pipe(req, { end: false });
                fileStream.on('end', function() {
                    req.end('\r\n--' + boundaryKey + '--');
                });
            }
        });
        return rsp
    }

    // is the repository open source 
    async _isShare() {
        if (!this.token || !this.project) throw new Error('You have to initialize first!')

        let rsp = await request({
            api: `https://${this.user}.coding.net/api/user/${this.user}/project/${this.project}/depot/${this.repo}/git`,
            token: this.token,
        });

        if (rsp.code) throw new Error(rsp.msg[Object.keys(rsp.msg)[0]] || 'Unknown Error');
        if (!rsp.data.depot) throw new Error('The Repository was not exist');

        return rsp.data.depot.shared
    }
    
    async _getPageUrl() {
        if (!this.token || !this.project) throw new Error('You have to initialize first!')
    
        let sites = await request({
            api: `https://${this.user}.coding.net/api/user/${this.user}/project/${this.project}/autodeploy/static-sites`,
            token: this.token,
        });

        if (sites.code) throw new Error(sites.msg[Object.keys(rsp.msg)[0]] || 'Unknown Error');
        if (!sites.data) return [];
    
        sites = sites.data;
    
        for (let i = 0; i < sites.total_page; i++) {
            let l = sites.list[i];
            let id = l.id;
    
            let pages = await request({
                api: `https://${this.user}.coding.net/api/user/${this.user}/project/${this.project}/autodeploy/static-sites/${id}`,
                token: this.token,
            })
    
            let deploys = await request({
                api: `https://${this.user}.coding.net/api/user/${this.user}/project/${this.project}/autodeploy/static-sites/${id}/tasks?page=1&page_size=10`,
                token: this.token,
            });
    
            let lastDeploy = deploys.data.list[deploys.data.list.length - 1];
            if (lastDeploy && lastDeploy.depot_name == this.repo) return pages.data.available_addresses
        }
        return [];
    }
}

function hash(buffer) {
    let sha256 = crypto.createHash('sha256');
    let hash = sha256.update(buffer).digest('hex');
    return hash;
}

function initialize ({
    token = null,
    repository = null,
}) {
    return new Coding({
        token,
        repository,
    });
}

module.exports = Object.assign(initialize, { Coding });