'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
    signatureVersion: 'v4',
});
const Sharp = require('sharp');

exports.handler = (event, context, callback) => {
    let response = event.Records[0].cf.response;
    console.log("Response status code :%s", response.status);

    if (response.status == 404) {
        let request = event.Records[0].cf.request;
        let s3Key = request.uri.substring(1);

        let prefix = undefined;
        let width = undefined;
        let imageName = undefined;
        let extension = undefined;

        try {
            // try matching s3 key with format <prefix>/<width>/<image_name>.<extension>
            // if matches, client is requesting resized version, which does not exist yet.
            let match = s3Key.match(/(.*)\/(\d+)\/(.*)\.(.*)/);
            prefix = match[0];
            width = match[1];
            imageName = match[2];
            extension = match[3];
        } catch (e) {
            // client is requesting original image, s3 object key format is <prefix>/<image_name>.<extension>
            // immediately return original 404 response because original image does not exist.
            callback(null, response);
        }

        const bucketId = process.env.S3_BUCKET_ID;
        const originalS3Key = prefix + "/" + imageName + "." + extension;
        S3.getObject({Bucket: bucketId, Key: originalS3Key}).promise()
            .then(data => {
                console.log("resizing image ${originalS3Key} to width: ${width}");
                Sharp(data.Body)
                    .resize(width)
                    .toFormat(extension === "jpg" ? "jpeg" : extension, undefined)
                    .toBuffer();
            })
            .then(buffer => {
                S3.putObject({
                    Body: buffer,
                    Bucket: bucketId,
                    ContentType: 'image/' + extension,
                    Key: s3Key,
                    StorageClass: 'STANDARD'
                }).promise().catch(err => {
                    console.log("Could not write resized image to bucket.", err)
                });

                // generate response with resized image
                response.status = 200;
                response.body = buffer.toString('base64');
                response.bodyEncoding = 'base64';
                response.headers['content-type'] = [{key: 'Content-Type', value: 'image/' + extension}];
                callback(null, response);
            })
            .catch(err => {
                console.log("Could not read original image ${originalS3Key}.", err);
            });
    } else {
        callback(null, response);
    }
};