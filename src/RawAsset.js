'use strict';

/*!
 * Pug Bundler: Raw Asset
 * Copyright(c) 2020 Adam Goldstein <agoldstein03@gmail.com>
 * MIT Licensed
 */

const fs = require("fs");

exports.name = "raw";
const regex = exports.regex = /(^.*$)/;

exports.rename = function rename(filePath) {
  return filePath;
}

exports.transform = function transform(data) {
  return [{
    path: data.filePath,
    contents: fs.readFileSync(data.filePath)
  }]
}