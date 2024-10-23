// @ts-nocheck

import { FastifyInstance } from "fastify";
import { STATUS_CODES } from "http";
import type { Argument } from "./types.js";

export class RESTError extends Error {
    constructor(
        public statusCode: number,
        public message: string
    ) {
        super(message);
    }

    toJSON() {
        return {
            error: this.message
        };
    }
}

export const errorHandler: Argument<FastifyInstance["setErrorHandler"], 0> = function (
    error,
    _request,
    reply
) {
    // @ts-ignore try to get the right status code
    reply.code(error.statusCode || 500);

    let message =
        // @ts-ignore
        (error.message ?? error.statusCode)
            ? // @ts-ignore
              STATUS_CODES[error.statusCode]
            : "Internal Server Error";
    let additional = {};

    // @ts-ignore
    if (error instanceof RESTError === false && !error.statusCode) {
        // print stack trace for debugging
        console.error(error);

        if (process.env.NODE_ENV === "production") {
            // avoid leaking sensitive information
            message = "Internal Server Error";
        } else {
            message = error.message;
            additional.stack = error.stack;
        }
    }

    if (error.validation) {
        additional.validation = error.validation;
    }

    // don't cache errors
    reply
        .header("Cache-Control", "max-age=1, must-revalidate")
        .send(error.toJSON?.() ?? { code: reply.statusCode, message, ...additional });
};
