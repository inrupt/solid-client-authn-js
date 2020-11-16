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
 * @packageDocumentation
 */

/**
 * Extends the regular JavaScript error object with access to the status code and status message.
 */

// TODO: Intent is to pull in the RDF/JS 'Iri' type, and also the Solid Client
//  Vocab Term type (which just extends 'Iri') and allow us use the bundled
//  error message value if included, or look it up dynamically if not (as a last
//  resort!).
type Iri = string;

export default class InruptError extends Error {
  public readonly statusCode?: number;
  public readonly statusText?: string;

  static lookupErrorMessage(iri: Iri, messageParams?: string[]): string {
    return `Error message looked up at: [${iri.toString()}]${
      messageParams ? `, with params [${messageParams?.toString()}]` : ""
    }`;
  }

  static appendResponseDetails(
    message: string,
    appendContextToMessage: boolean,
    errorResponse?: Response
  ) {
    if (appendContextToMessage && typeof errorResponse !== "undefined") {
      return `${message} Details: status code [${errorResponse.status}], status text [${errorResponse.statusText}].`;
    }

    return message;
  }

  constructor(
    messageOrIri: string | Iri,
    errorResponse?: Response & { ok: false },
    appendContextToMessage: boolean = true,
    messageParams?: string[]
  ) {
    super(
      InruptError.appendResponseDetails(
        typeof messageOrIri === "string"
          ? messageOrIri
          : InruptError.lookupErrorMessage(messageOrIri, messageParams),
        appendContextToMessage,
        errorResponse
      )
    );

    if (typeof errorResponse !== "undefined") {
      this.statusCode = errorResponse.status;
      this.statusText = errorResponse.statusText;
    }
  }
}
