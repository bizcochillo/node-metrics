const Hapi = require('@hapi/hapi');
const fs = require('fs')
const path = require('path');
const crypto = require('crypto');
const { createPlugin, getSummary, getContentType } = require('@promster/hapi');

const IMAGE_UPLOAD_FOLDER = process.env.IMAGE_STORE_PATH

//TODO: Port hardcoded!!
const server = Hapi.server({
    host: '0.0.0.0',
    port: 8080,
});


function getImageFileInfo(file) {
    const digest = path.basename(path.dirname(file))
    const filename = path.basename(file)
    const stats = fs.statSync(file)
    const data = {
        id: digest,
        name: filename,
        image: stats.size,
        timestamp: stats.birthtime.toISOString()
    };
    return data
}

server.register(createPlugin()).then(() => {
    // UPLOAD IMAGE
    server.route({
        method: 'POST',
        path: '/image',
        options: {
            payload: {
                output: 'stream',
                parse: true,
                allow: 'multipart/form-data',
                multipart: true
            }
        },
        handler: function(req, h) {
            const data = req.payload
            if (data.file) {
                const name = data.file.hapi.filename
                const path_target = /*__dirname + "\\uploads\\"*/ IMAGE_UPLOAD_FOLDER + name
                const file = fs.createWriteStream(path_target);
                const hash = crypto.createHash('md5');
                hash.setEncoding('hex');
                data.file.pipe(file)
                data.file.pipe(hash)
                return new Promise((resolve, reject) => {
                    file.on('error', (err) => reject(err))
                    data.file.on('end', (err) => {
                        if (err) reject(err())
                        hash.end()
                        const hashResult = hash.digest('base64url')
                        const dir = /*__dirname + "\\uploads\\"*/ IMAGE_UPLOAD_FOLDER + hashResult
                        if (!fs.existsSync(dir)) {
                            fs.mkdirSync(dir);
                        }
                        const stored_file = dir + '/' + name
                        fs.rename(path_target, stored_file, function(err) {
                            if (err) throw err
                            const output_data = getImageFileInfo(stored_file)
                            console.log(output_data)
                            resolve(output_data)
                        })
                    })
                })
            } else
                return h.response('Cannot parse the content').code(400)
        }
    })

    // RETRIEVE IMAGE INFO
    server.route({
        method: 'GET',
        path: '/image/{id}',
        handler: async function(req, h) {
            const dir = /*__dirname + "\\uploads\\"*/ IMAGE_UPLOAD_FOLDER + req.params.id
            if (!fs.existsSync(dir)) {
                return h.response("Digest not found").code(404)
            }
            const files = fs.readdirSync(dir)
                // always returns the first file. 
            if (files && files.length > 0)
                return h.response(getImageFileInfo(dir + '/' + files[0])).code(200)
            return h.response("File not found").code(404)
        }
    })

    // DUPLICATES
    //TODO: - Synchronous method
    //      - Does not take into account if the item is a file or a directory. 
    //      - Does not handle errors out of hapi
    server.route({
        method: 'GET',
        path: '/image/duplicates',
        handler: async function(request, h) {
            const dirs = fs.readdirSync(IMAGE_UPLOAD_FOLDER /*__dirname + '/uploads'*/ )
            let result = []
            for (const directory of dirs) {
                const files = fs.readdirSync( /*__dirname + '/uploads/'*/ IMAGE_UPLOAD_FOLDER + directory)
                if (files && files.length > 1) {
                    for (const file of files) {
                        result.push(getImageFileInfo( /*__dirname + '/uploads/'*/ IMAGE_UPLOAD_FOLDER + directory + '/' + file))
                    }
                }
            }
            console.log(result)
            return h.response(result).code(200)
        }
    })

    // METRICS
    server.route({
        method: 'GET',
        path: '/metrics',
        handler: async function(req, h) {
            req.statusCode = 200;
            h.response().header('Content-Type', getContentType());
            return h.response(await getSummary()).code(200);
        }
    })

    server.events.on('request', (request, event) => {
        console.log(`Event: ${JSON.stringify(event)}`);
    });

    server.events.on('response', (request) => {
        console.log(`Response Status Code: ${request.response.statusCode}`);
    });

    server.start();
    console.log(`Server running at: ${server.info.uri}`);
})