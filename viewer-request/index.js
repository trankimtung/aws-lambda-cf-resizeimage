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

const Querystring = require('querystring');

/**
 * Width variants clients are allowed to query.
 * Requested width if not among those specified here will be overridden by the nearest lower specified value.
 *
 * @type {number[]}
 */
const supportedWidths = [128,256,512,1024,1080,1920,2056];

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;

    // parse prefix, image name and extension from original uri: <prefix>/<imageName>.<extension>
    console.log("Request uri: %s", request.uri);
    const uriMatch = request.uri.match(/(.*)\/(.*)\.(.*)/);
    let prefix = uriMatch[1];
    let imageName = uriMatch[2];
    let extension = uriMatch[3];

    // if querystring contains width value, try to match with largest supported value below specified value
    console.log("Querystring: %s", request.querystring);
    let width = undefined;
    const params = Querystring.parse(request.querystring);
    if (params.w) {
        width = supportedWidths[0];
        for (let supportedWidth of supportedWidths) {
            if (params.w >= supportedWidth) {
                width = supportedWidth;
            }
        }
    }

    // compose new uri with format: <prefix>/<width>/<imageName>.<extension>
    let newUri = [];
    newUri.push(prefix);
    if (width) newUri.push(width);
    newUri.push(imageName + "." + extension);
    request.uri = newUri.join("/");
    console.log("Forward uri: %s", request.uri);

    callback(null, request);
};