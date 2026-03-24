// Exports
import * as _ from "./runtime";
export * from "./runtime";
export * from "./preloader";
// @ts-ignore Set by webpack at bundle time
export const version = VERSION;
export const Runtime = new _.Runtime();
void Runtime.init();
