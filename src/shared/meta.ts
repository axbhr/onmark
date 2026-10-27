import pkg from '../../package.json';

// Single source of truth for naming is package.json; renaming the extension only touches that file.
export const EXTENSION_ID = pkg.name;
export const VIEW_TYPE = `${EXTENSION_ID}.editor`;
