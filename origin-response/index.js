/*
 * MIT License
 *
 * Copyright (c) 2019 Tran Kim Tung
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

'use strict';

const AWS = require('aws-sdk');
const S3 = new AWS.S3({
    signatureVersion: 'v4',
});
const Sharp = require('sharp');

/**
 * Origin S3 bucket id.
 *
 * @type {string}
 */
const bucketId = 's3_bucket_id';

exports.handler = (event, context, callback) => {
    let response = event.Records[0].cf.response;

    console.log("Origin response status: %s", response.status);
    if (response.status == 404) {
        let request = event.Records[0].cf.request;
        let s3Key = request.uri.substring(1);
        console.log("Requested image: %s", s3Key);

        let prefix = undefined;
        let width = undefined;
        let imageName = undefined;
        let extension = undefined;

        try {
            // try matching s3 key with format <prefix>/<width>/<image_name>.<extension>
            // if matches, client is requesting resized version, which does not exist yet.
            let match = s3Key.match(/(.*)\/(\d+)\/(.*)\.(.*)/);
            prefix = match[1];
            width = match[2];
            imageName = match[3];
            extension = match[4];
        } catch (e) {
            // client is requesting original image, s3 object key format is <prefix>/<image_name>.<extension>
            // immediately return original 404 response because original image does not exist.
            console.log("Image not found. Returns 404 response.");
            callback(null, response);
        }


        const originalS3Key = prefix + "/" + imageName + "." + extension;
        console.log("Original image: %s", originalS3Key);
        S3.getObject({Bucket: bucketId, Key: originalS3Key}).promise()
            .then(data => {
                console.log("Resizing image %s to width %s", originalS3Key, width);
                Sharp(data.Body)
                    .resize({ width: parseInt(width, 10) })
                    .toFormat(extension === "jpg" ? "jpeg" : extension, undefined)
                    .toBuffer()
                    .then(buffer => {
                        S3.putObject({
                            Body: buffer,
                            Bucket: bucketId,
                            ContentType: 'image/' + extension,
                            Key: s3Key,
                            StorageClass: 'STANDARD'
                        }).promise().catch(err => {
                            console.log("Could not save resized image to bucket.", err)
                        });

                        // generate response with resized image
                        response.status = 200;
                        response.body = buffer.toString('base64');
                        response.bodyEncoding = 'base64';
                        response.headers['content-type'] = [{key: 'Content-Type', value: 'image/' + extension}];

                        console.log("Returns resized image.");
                        callback(null, response);
                    })
                    .catch(() => {
                        console.log("Could not resize image.");
                    });
            })
            .catch(() => {
                console.log("Could not read original image: %s", originalS3Key);
            });
    } else {
        callback(null, response);
    }
};