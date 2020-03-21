/**
 * Request credentials that a AuthenticatedFetcher should consume to make a request
 *
 * @type A string denoting the type of credentials these are
 */

// TODO: this should be an "OR" of all possible request credentials
export default interface IRequestCredentials {
  type: string;
  localUserId: string;
}
