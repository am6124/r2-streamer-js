// ==LICENSE-BEGIN==
// Copyright 2017 European Digital Reading Lab. All rights reserved.
// Licensed to the Readium Foundation under one or more contributor license agreements.
// Use of this source code is governed by a BSD-style license
// that can be found in the LICENSE file exposed on Github (readium) in the project repository.
// ==LICENSE-END==

import * as debug_ from "debug";
import * as express from "express";
import * as morgan from "morgan";

import { IRequestPayloadExtension, _urlEncoded } from "./request-ext";
import { Server } from "./server";
import { trailingSlashRedirect } from "./server-trailing-slash-redirect";

const debug = debug_("r2:streamer#http/server-url");

export function serverUrl(_server: Server, topRouter: express.Application) {

    const routerUrl = express.Router({ strict: false });
    routerUrl.use(morgan("combined", { stream: { write: (msg: any) => debug(msg) } }));

    routerUrl.use(trailingSlashRedirect);

    routerUrl.get("/", (_req: express.Request, res: express.Response) => {

        let html = "<html><head>";
        html += `<script type="text/javascript">function encodeURIComponent_RFC3986(str) { ` +
            `return encodeURIComponent(str).replace(/[!'()*]/g, (c) => { ` +
            `return "%" + c.charCodeAt(0).toString(16); }); }` +
            `function go(evt) {` +
            `if (evt) { evt.preventDefault(); } var url = ` +
            `location.origin +` +
            // `location.protocol + '//' + location.hostname + ` +
            // `(location.port ? (':' + location.port) : '') + ` +
            ` '/url/' +` +
            ` encodeURIComponent_RFC3986(document.getElementById("url").value);` +
            `location.href = url;}</script>`;
        html += "</head>";

        html += "<body><h1>Publication URL</h1>";

        html += `<form onsubmit="go();return false;">` +
            `<input type="text" name="url" id="url" size="80">` +
            `<input type="submit" value="Go!"></form>`;

        html += "</body></html>";

        res.status(200).send(html);
    });

    routerUrl.param("urlEncoded", (req, _res, next, value, _name) => {
        (req as IRequestPayloadExtension).urlEncoded = value;
        next();
    });

    routerUrl.get("/:" + _urlEncoded + "(*)", (req: express.Request, res: express.Response) => {

        const reqparams = req.params as IRequestPayloadExtension;

        if (!reqparams.urlEncoded) {
            reqparams.urlEncoded = (req as IRequestPayloadExtension).urlEncoded;
        }

        const urlDecoded = reqparams.urlEncoded;
        // if (urlDecoded.substr(-1) === "/") {
        //     urlDecoded = urlDecoded.substr(0, urlDecoded.length - 1);
        // }
        debug(urlDecoded);

        const urlDecodedBase64 = new Buffer(urlDecoded).toString("base64");
        const redirect = req.originalUrl.substr(0, req.originalUrl.indexOf("/url/"))
            + "/pub/" + urlDecodedBase64 + "/";

        // No need for CORS with this URL redirect (HTML page lists available services)
        // server.setResponseCORS(res);

        debug(`REDIRECT: ${req.originalUrl} ==> ${redirect}`);
        res.redirect(301, redirect);
    });

    topRouter.use("/url", routerUrl);
}
