//
// Copyright Inrupt Inc.
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to use,
// copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
// Software, and to permit persons to whom the Software is furnished to do so,
// subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,
// INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
// PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
// HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION
// OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
// SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
//

export function isValidRedirectUrl(redirectUrl: string): boolean {
  // If the redirect URL is not a valid URL, an error will be thrown.
  try {
    const urlObject = new URL(redirectUrl);
    const noReservedQuery =
      !urlObject.searchParams.has("code") &&
      !urlObject.searchParams.has("state");
    // As per https://tools.ietf.org/html/rfc6749#section-3.1.2, the redirect URL
    // must not include a hash fragment.
    const noHash = urlObject.hash === "";
    return noReservedQuery && noHash;
  } catch (e) {
    return false;
  }
}

export function removeOpenIdParams(redirectUrl: string): URL {
  const cleanedUpUrl = new URL(redirectUrl);
  // For auth code flow
  cleanedUpUrl.searchParams.delete("state");
  cleanedUpUrl.searchParams.delete("code");
  // For login error
  cleanedUpUrl.searchParams.delete("error");
  cleanedUpUrl.searchParams.delete("error_description");
  // For RFC9207
  cleanedUpUrl.searchParams.delete("iss");
  return cleanedUpUrl;
}
