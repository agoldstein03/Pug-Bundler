'use strict';

/*!
 * Pug Bundler: Sass/SCSS Asset
 * Copyright(c) 2020 Adam Goldstein <agoldstein03@gmail.com>
 * MIT Licensed
 */

const sass = require("sass"),
  csstree = require("css-tree"),
  path = require("path");
  //gonzales = require('gonzales-pe');

exports.name = "sass";
const regex = exports.regex = /(^.*)(\.sass|\.scss)$/;

function rename(filePath) {
  return filePath.replace(regex, "$1.css");
}
exports.rename = rename;

exports.transform = function transform(data) {
  const sourceMap = data.options.sourceMap === undefined ? true : data.options.sourceMap,
    render = sass.renderSync({
      file: data.filePath,
      sourceMap,
      outFile: rename(data.basename),
      ...data.options
    }),
    files = [{
      path: rename(data.filePath),
      contents: render.css
    }],
    tree = csstree.parse(render.css);
  csstree.walk(tree, function(node) {
    if (this.declaration !== null && node.type === 'Url') {
      const value = node.value;
      if (value.type === 'Raw') {
        data.bundler.registerAndRename(value.value, path.dirname(files[0].path))
      } else {
        data.bundler.registerAndRename(value.value.slice(1, -1), path.dirname(files[0].path))
      }
    }
  });
  if (sourceMap) {
    files.push({
      path: rename(data.filePath)+".map",
      contents: render.map
    });
  }
  return files;
}