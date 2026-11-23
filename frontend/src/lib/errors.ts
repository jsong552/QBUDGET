import { ApiError } from './apiClient'

const fallbackMessage = 'Something went wrong. Please try again.'

function messageForStatus(status: number): string {
  if (status === 401) return 'Your session has expired. Sign in again.'
  if (status === 403) return 'You do not have access to this.'
  if (status === 404) return 'This item no longer exists. Refresh the page.'
  if (status >= 500) return 'The server could not complete this request. Please try again.'
  return fallbackMessage
}

/** Turns anything thrown by a request or a form check into a message that can be shown to the user. */
export function errorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    // apiClient uses this wording only when the response carried no message of its own.
    return error.message && !error.message.startsWith('API returned HTTP') ? error.message : messageForStatus(error.status)
  }
  if (error instanceof DOMException && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
    return 'The server took too long to respond. Please try again.'
  }
  // fetch reports network failures as a TypeError ("Failed to fetch", "NetworkError when attempting to fetch resource.").
  if (error instanceof TypeError && /fetch|network/i.test(error.message)) {
    return 'Could not reach the server. Check your connection and try again.'
  }
  if (error instanceof Error && error.message) return error.message
  return fallbackMessage
}

/**
 * The error to show on the page. While a form is open, its save error is shown inside the form,
 * so it is left out here; load errors still show.
 */
export function pageError(error: unknown, formError: unknown, formOpen: boolean): unknown {
  return formOpen && error === formError ? null : error
}

/** True when the API answered 404: the item was already removed. */
export function isNotFound(error: unknown): boolean {
  return error instanceof ApiError && error.status === 404
}
