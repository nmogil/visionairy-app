/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as ResendOTP from "../ResendOTP.js";
import type * as admin from "../admin.js";
import type * as ai from "../ai.js";
import type * as auth from "../auth.js";
import type * as game from "../game.js";
import type * as generate_generate from "../generate/generate.js";
import type * as generate_google from "../generate/google.js";
import type * as generate_lib from "../generate/lib.js";
import type * as generate_openai from "../generate/openai.js";
import type * as http from "../http.js";
import type * as lib_constants from "../lib/constants.js";
import type * as rooms from "../rooms.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  ResendOTP: typeof ResendOTP;
  admin: typeof admin;
  ai: typeof ai;
  auth: typeof auth;
  game: typeof game;
  "generate/generate": typeof generate_generate;
  "generate/google": typeof generate_google;
  "generate/lib": typeof generate_lib;
  "generate/openai": typeof generate_openai;
  http: typeof http;
  "lib/constants": typeof lib_constants;
  rooms: typeof rooms;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
