/*
 * Copyright 2021 Inrupt Inc.
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

import { describe, it, expect } from "@jest/globals";

import { Response } from "cross-fetch";
import { INRUPT_TEST, UI_COMMON } from "@inrupt/vocab-inrupt-common";

// Just for our tests we need to import an implementation of RDF/JS types.
import { NamedNode } from "n3";
import { getLocalStore, CONTEXT_KEY_LOCALE } from "@inrupt/solid-common-vocab";

import InruptError from "./InruptError";

describe("InruptError", () => {
  describe("simple error message strings", () => {
    it("treats a message as a simple message", () => {
      const message = "Normal error string...";
      const error = new InruptError(message);

      expect(error.name).toEqual("Error");
      expect(error.toString()).toContain(message);
    });

    it("treats a message as a simple message having params", () => {
      const error = new InruptError(
        "Normal [{{1}}] error string with [{{0}}]...",
        ["one", "two"]
      );

      expect(error.name).toEqual("Error");
      expect(error.toString()).toContain(
        "Error: Normal [two] error string with [one]..."
      );
    });

    it("fails if message has incorrect number of params", () => {
      expect(
        () =>
          new InruptError("Normal [{{1}}] error string with [{{0}}]...", [
            "one",
            "two",
            "three",
          ])
      ).toThrow("requires [2] params and we received [3]");
    });
  });

  describe("errors that include HTTP response meta-data", () => {
    it("extracts HTTP Response details, but doesn't append details to message", () => {
      const failedResponse = new Response(undefined, {
        status: 404,
      }) as Response & { ok: false };

      const message = "Normal error string...";
      const error = new InruptError(message).httpResponse(
        failedResponse,
        false
      );

      expect(error.name).toEqual("Error");
      expect(error.hasHttpResponse()).toEqual(true);
      expect(error.getHttpStatusCode()).toEqual(404);
      expect(error.getHttpStatusText()).toEqual("Not Found");
      expect(error.toString()).toContain(message);
      expect(error.toString()).not.toContain("404");
    });

    it("extracts HTTP Response details, and appends details to message", () => {
      const failedResponse = new Response(undefined, {
        status: 404,
      }) as Response & { ok: false };

      const message = "Normal error string...";
      const error = new InruptError(message).httpResponse(failedResponse);

      expect(error.name).toEqual("Error");
      expect(error.hasHttpResponse()).toEqual(true);
      expect(error.getHttpStatusCode()).toEqual(404);
      expect(error.getHttpStatusText()).toEqual("Not Found");
      expect(error.toString()).toContain(message);
      expect(error.toString()).toContain("404");
    });

    it("throws if no HTTP response", () => {
      const message = "Normal error string...";
      const error = new InruptError(message);

      expect(error.hasHttpResponse()).toBeFalsy();
      expect(() => error.getHttpStatusCode()).toThrow(
        "can't get its HTTP Status Code."
      );
      expect(() => error.getHttpStatusText()).toThrow(
        "can't get its HTTP Status Text!"
      );
    });

    it("get HTTP response returns undefined if no HTTP response", () => {
      const message = "Normal error string...";
      const error = new InruptError(message);

      expect(error.getHttpResponse()).toBeUndefined();
    });

    it("gets the specified HTTP response if it was provided", () => {
      const failedResponse = new Response(undefined, {
        status: 404,
      }) as Response & { ok: false };

      const message = "Normal error string...";
      const error = new InruptError(message).httpResponse(failedResponse);

      expect(error.getHttpResponse()).toEqual(failedResponse);
    });
  });

  describe("errors coming from RDF vocabs", () => {
    describe("from remote (non-locally imported) vocabs", () => {
      it("pulls message string from remote RDF vocab", () => {
        const errorIri = new NamedNode("https://example.com/vocab#errTest1");
        const error = new InruptError(errorIri);

        expect(error.name).toEqual("Error");
        expect(error.toString()).toContain(errorIri.value);

        // TODO: PMcB55: Replace this when (if?) we do actually lookup vocabs
        //  dynamically at runtime!
        expect(error.toString()).toContain("message looked up at");
      });

      it("pulls message string from remote RDF vocab, having params", () => {
        const errorIri = new NamedNode("https://example.com/vocab#errTest1");
        const params = ["one", "two"];
        const error = new InruptError(errorIri, params);

        expect(error.name).toEqual("Error");
        expect(error.toString()).toContain(params[0]);
        expect(error.toString()).toContain(params[1]);
        expect(error.toString()).toContain(errorIri.value);

        expect(error.toString()).toContain("message looked up at");
      });
    });

    describe("from locally imported vocabs", () => {
      it("reports failure to find message value on RDF vocab term with no message", () => {
        // We deliberately use a Vocab Term without any message values...
        const errorIri = INRUPT_TEST.somePredicate;
        const error = new InruptError(errorIri);

        expect(error.name).toEqual("Error");
        expect(error.toString()).toContain(errorIri.value);
        expect(error.toString()).toContain("found no message value");
      });

      it("pulls parameterized message string from local RDF vocab", () => {
        const vocabError = UI_COMMON.errFileUpload_exceededSizeLimit;
        const params = ["one", "two", "three"];
        const error = new InruptError(vocabError, params);

        expect(error.name).toEqual("Error");
        expect(error.hasHttpResponse()).toBeFalsy();
        expect(error.toString()).toContain(params[0]);
        expect(error.toString()).toContain(params[1]);
        expect(error.toString()).toContain(params[2]);
        expect(error.toString()).toContain(vocabError.value);

        expect(error.toString()).toContain("has size");
        expect(error.toString()).toContain("that exceeds the allowable limit");
      });

      it("pulls localized parameterized message string from local RDF vocab", () => {
        const errorIri = UI_COMMON.errFileUpload_exceededSizeLimit;
        const params = ["one", "two", "three"];

        const locale = getLocalStore().getItem(CONTEXT_KEY_LOCALE) as string;
        try {
          getLocalStore().setItem(CONTEXT_KEY_LOCALE, "es");

          const error = new InruptError(errorIri, params);

          expect(error.name).toEqual("Error");
          expect(error.hasHttpResponse()).toBeFalsy();
          expect(error.toString()).toContain(params[0]);
          expect(error.toString()).toContain(params[1]);
          expect(error.toString()).toContain(params[2]);
          expect(error.toString()).toContain(errorIri.value);

          expect(error.toString()).toContain("del archivo");
          expect(error.toString()).toContain("excede el límite permitido");
        } finally {
          getLocalStore().setItem(CONTEXT_KEY_LOCALE, locale);
        }
      });

      it("pulls localized parameterized message string from local RDF vocab with HTTP response and no IRI", () => {
        const errorIri = UI_COMMON.errFileUpload_exceededSizeLimit;
        const params = ["one", "two", "three"];

        const locale = getLocalStore().getItem(CONTEXT_KEY_LOCALE) as string;
        try {
          getLocalStore().setItem(CONTEXT_KEY_LOCALE, "fr");

          const failedResponse = new Response(undefined, {
            status: 404,
          }) as Response & { ok: false };

          const error = new InruptError(errorIri, params, false).httpResponse(
            failedResponse,
            true
          );

          expect(error.name).toEqual("Error");
          expect(error.hasHttpResponse()).toEqual(true);
          expect(error.getHttpStatusCode()).toEqual(404);
          expect(error.getHttpStatusText()).toEqual("Not Found");
          expect(error.toString()).toContain(params[0]);
          expect(error.toString()).toContain(params[1]);
          expect(error.toString()).toContain(params[2]);

          // We don't expect the IRI in the message itself.
          expect(error.toString()).not.toContain(errorIri.value);

          expect(error.toString()).toContain("La taille du fichier");
          expect(error.toString()).toContain("dépasse la limite autorisée");
        } finally {
          getLocalStore().setItem(CONTEXT_KEY_LOCALE, locale);
        }
      });
    });
  });
});
