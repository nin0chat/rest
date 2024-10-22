import { CAPTCHA_SITEVERIFY } from './constants.js';
import { RESTError } from './error.js';

export async function validateCaptcha(response: string) {
if (process.env.NODE_ENV === 'development') return

  const {success} = await fetch(CAPTCHA_SITEVERIFY, {
      method: "POST",
      headers: {
          "Content-Type": "application/json"
      },
      body: JSON.stringify({
          response: response,
          secret: process.env.TURNSTILE_SECRET
      })
  }).then(res => res.json());

  if (!success) throw new RESTError(400, "Failed CAPTCHA verification");
}
