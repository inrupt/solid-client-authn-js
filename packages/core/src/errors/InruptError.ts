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

/**
 * In a subsequent PR, just re-export needed implementations from generated
 * artifacts directly, e.g. like @inrupt/solid-common-vocab, e.g. in the
 * `index.hbs` template of RDF/JS artifacts include this:
 // Re-export some of the basic RDF/JS implementations that we use ourselves -
 // allows users of our generated artifacts to easily import these
 // implementations if they want (e.g. in their tests, or to instantiate
 // hard-coded IRIs for convenience (as they shouldn't really need to do that
 // much, instead using our generated constants in most cases)).
 export { NamedNode } from "rdf-js";
 *  Then we can either import that implementation in this code, or just import
 *  the types when needed here, e.g.:
 import type { NamedNode } from "rdf-js";
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
    appendHttpDetails = true,
    appendErrorIri = true
  ) {
    super(
      InruptError.appendHttpResponseDetails(
        typeof messageOrIri === "string"
          ? InruptError.substituteParams(messageOrIri, messageParams)
          : InruptError.appendErrorIri(
              InruptError.lookupErrorIri(messageOrIri, messageParams),
              messageOrIri as NamedNode,
              appendErrorIri
            ),
        httpResponse,
        appendHttpDetails
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

  /**
   * Given the IRI for an error message term, first check if it's a local
   * Vocab Term (in which case we expect the error messages (in potentially
   * multiple languages) to be accessible directly.
   * If however the IRI is just a raw IRI, then attempt to lookup the term
   * dynamically by simply de-referencing it and asking for RDF back (which we
   * then need to parse and extract the relevant message string).
   *
   * NOTE: if we find the referenced term, but it has no explicit message
   * values associated with it (e.g. the term `https://schema.org/Person` would
   * resolve, but it has no Vocab Term-defined 'message' triples associated with
   * it), then we return a fixed message string explaining this, but that
   * includes the error IRI and the provided parameters.
   *
   * @param iri the IRI of the error message term from an RDF vocabulary
   * @param messageParams parameters to replace expected placeholders in the message string
   */
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

  /**
   * Convenience method to append certain HTTP response details to our error
   * message (e.g. the HTTP status code, or the status text).
   *
   * @param message the message string to append to
   * @param response the optional HTTP response
   * @param append flag telling us to append or not
   */
  static appendHttpResponseDetails(
    message: string,
    response: Response | undefined,
    append: boolean
  ): string {
    if (append && typeof response !== "undefined") {
      return `${message} HTTP details: status code [${response.status}], status text [${response.statusText}].`;
    }

    return message;
  }

  /**
   * Convenience method to append the error term's IRI value to our error
   * message (which can be a very helpful reference, since it's basically the ID
   * of the error message itself).
   *
   * @param message the message string to append to
   * @param iri the IRI of the error term
   * @param append flag telling us to append or not
   */
  static appendErrorIri(
    message: string,
    iri: NamedNode,
    append: boolean
  ): string {
    return append ? `${message} Error IRI: [${iri.value}].` : message;
  }

  /**
   * Scans the specified message returning a copy with all placeholders replaced
   * with their corresponding parameter value.
   *
   * Note: If the number of parameters provided does not exactly match the
   * number of placeholders, we throw an exception explaining this (as we
   * consider it a programmer error).
   *
   * @param message the message within which to replace placeholders
   * @param params the parameters to replaces the placeholders
   */
  static substituteParams(message: string, params?: string[]): string {
    let fullMessage = message;
    if (params !== undefined) {
      const paramsRequired = message.split("{{").length - 1;
      if (paramsRequired !== params.length) {
        throw new Error(
          `Setting parameters on message [${message}], but it requires [${paramsRequired}] params and we received [${params.length}].`
        );
      }

      for (let i = 0; i < params.length; i += 1) {
        const marker = `{{${i}}}`;
        fullMessage = fullMessage.replace(marker, params[i]);
      }
    }

    return fullMessage;
  }
}
