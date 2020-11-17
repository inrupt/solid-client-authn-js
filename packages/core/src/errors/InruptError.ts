/*
 * Copyright 2020 Inrupt Inc.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal in
 * the Software without restriction, including without limitation the rights to use,
 * copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
 * Software, and to permit persons to whom the Software is furnished to do so,
 * subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
 * INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
 * PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
 * HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
 * OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 */

/**
 * @hidden
 * Extends the regular JavaScript error object with extra meta-data (e.g.
 * potentially data from a HTTP response, or with data from an RDF vocabulary
 * (which may be imported locally, or looked up dynamically at runtime)).
 * @packageDocumentation
 */

import { NamedNode } from "n3";

import { VocabTerm } from "@inrupt/solid-common-vocab";

export default class InruptError extends Error {
  public readonly statusCode?: number;

  public readonly statusText?: string;

  constructor(
    messageOrIri: string | NamedNode | VocabTerm,
    messageParams?: string[],
    httpResponse?: Response & { ok: false },
    appendHttpDetailsToMessage = true,
    appendErrorIriToMessage = true
  ) {
    super(
      InruptError.appendResponseDetails(
        typeof messageOrIri === "string"
          ? messageOrIri
          : InruptError.appendErrorIri(
              InruptError.lookupErrorIri(messageOrIri, messageParams),
              appendErrorIriToMessage,
              messageOrIri as NamedNode
            ),
        appendHttpDetailsToMessage,
        httpResponse
      )
    );

    if (typeof httpResponse !== "undefined") {
      this.statusCode = httpResponse.status;
      this.statusText = httpResponse.statusText;
    }
  }

  static determineIfVocabTerm(
    value: NamedNode | VocabTerm
  ): value is VocabTerm {
    if ((value as VocabTerm).strict !== undefined) {
      return true;
    }
    return false;
  }

  static lookupErrorIri(
    iri: NamedNode | VocabTerm,
    messageParams?: string[]
  ): string {
    if (InruptError.determineIfVocabTerm(iri)) {
      const message =
        messageParams === undefined
          ? iri.message
          : iri.messageParams(...messageParams);

      return message === undefined
        ? `Looked up error message IRI [${iri.value}], but found no message value.`
        : message;
    }

    return `Error message looked up at: [${iri.value}]${
      messageParams === undefined
        ? ""
        : `, with params [${messageParams.toString()}]`
    }`;
  }

  static appendResponseDetails(
    message: string,
    appendContextToMessage: boolean,
    errorResponse?: Response
  ): string {
    if (appendContextToMessage && typeof errorResponse !== "undefined") {
      return `${message} HTTP details: status code [${errorResponse.status}], status text [${errorResponse.statusText}].`;
    }

    return message;
  }

  static appendErrorIri(
    message: string,
    appendErrorIri: boolean,
    iri: NamedNode
  ): string {
    return appendErrorIri ? `${message} Error IRI: [${iri.value}].` : message;
  }
}
