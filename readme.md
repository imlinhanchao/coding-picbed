# Coding 图床

基于 Coding 企业版仓库的图床。通过『静态网站』或**公开源代码**的方式获得外链链接。使用 Coding 个人令牌 API 上传图像。

## 安装

```bash
npm install coding-picbed
```

## 用法 

```javascript
const coding = require('coding-picbed')({
    token: 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx',
    repository: 'https://imlinhanchao.coding.net/imlinhanchao/upload-file'
});
const path = require('path');
const fs = require('fs');

router.post('/upload', async (req, res, next) => {
    let data = req.files[0].buffer;
    let filename = req.files[0].originalname;
    let filepath = path.join(__dirname, filename);

    fs.writeFileSync(filepath, data)
    let upload = await coding.upload(filepath, '/', filename);
    fs.unlinkSync(filepath);

    res.json(upload);
})
```

或者 

```javascript
const { Coding } = require('coding-picbed');
const path = require('path');
const fs = require('fs');

router.post('/upload', async (req, res, next) => {

    let coding = new Coding();
    await coding.config({
        token: req.query.token,
        repository: req.query.repo
    });

    let data = req.files[0].buffer;
    let filename = req.files[0].originalname;
    let filepath = path.join(__dirname, filename);

    fs.writeFileSync(filepath, data)
    let upload = await coding.upload(filepath, '/', filename);
    fs.unlinkSync(filepath);

    res.json(upload);
})
```

## 准备

1. 您需要在个人设置[访问令牌](https://help.coding.net/docs/member/tokens.html)中创建访问令牌. 只需要开放 `project|project:depot|project:file` 权限即可。
~~2. 创建用于上传文件的存储库，开通『构建与部署』中**静态网站**服务或公开仓库源代码。~~

## 函数

### 配置上传选项

```javascript
async function config({ token, repository });
```

#### 参数对象
|键|描述|
|--|--|
|token|你创建的 Coding 访问令牌。|
|repository|你的用于上传文件存储库地址。|

### 检查初始化状态

```javascript
async function isInitialized();
```

#### 返回值
**bool** - true 表示完成初始化。

### 上传文件

```javascript
async function upload(filepath, dir, filename);
```

#### 参数对象
|键|描述|
|--|--|
|filepath|您要上传的文件路径。|
|dir|你要保存到仓库的文件夹，若不存在会自动创建。（可选）|
|filename|你要保存到仓库的文件名。（可选）|

#### 返回值
|键|描述|
|--|--|
|filename|最终上传的文件名。|
|urls|所有可用的 Web 访问地址。|

## 注意事项

配置 Coding 存储库地址和访问令牌后，大约需要几秒钟来获取 Coding 仓库的信息。因此，请不要在配置后立即上传。你可以使用 `isInitialized` 检查初始化是否已完成，或者使用 `await` 等待配置完成。
