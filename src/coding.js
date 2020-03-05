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

    return {
        isShare,
        getPageUrl
    }
}