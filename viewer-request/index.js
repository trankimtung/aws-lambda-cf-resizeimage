'use strict';

const Querystring = require('querystring');

exports.handler = (event, context, callback) => {
    const request = event.Records[0].cf.request;

    // parse prefix, image name and extension from original uri: <prefix>/<imageName>.<extension>
    const uriMatch = uri.match(/(.*)\/(.*)\.(.*)/);
    let prefix = uriMatch[0];
    let imageName = uriMatch[1];
    let extension = uriMatch[2];

    // if querystring contains width value, try to match with largest supported value below specified value
    let width = undefined;
    const supportedWidths = process.env.SUPPORTED_WIDTHS.split(',');
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

    callback(null, request);
};