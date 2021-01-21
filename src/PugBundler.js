'use strict';

/*!
 * Pug Bundler
 * Copyright(c) 2020 Adam Goldstein <agoldstein03@gmail.com>
 * MIT Licensed
 * 
 * ATTRS and META constants are taken from the HTMLAsset.js file in parcel-bundler, Copyright (c) 2017-present Devon Govett and licensed under the MIT License
 */

const path = require('path'),
  fs = require("fs"),
  recursiveReadSync = require('recursive-readdir-sync'),
  nodeEval = require("node-eval");

const ATTRS = {
    src: [
      'script',
      'img',
      'audio',
      'video',
      'source',
      'track',
      'iframe',
      'embed'
    ],
    href: ['link', 'a', 'use'],
    srcset: ['img', 'source'],
    poster: ['video'],
    'xlink:href': ['use', 'image'],
    //content: ['meta'],
    data: ['object']
  },
  META = {
    property: [
      'og:image',
      'og:image:url',
      'og:image:secure_url',
      'og:audio',
      'og:audio:secure_url',
      'og:video',
      'og:video:secure_url'
    ],
    name: [
      'twitter:image',
      'msapplication-square150x150logo',
      'msapplication-square310x310logo',
      'msapplication-square70x70logo',
      'msapplication-wide310x150logo',
      'msapplication-TileImage',
      'msapplication-config'
    ],
    itemprop: [
      'image',
      'logo',
      'screenshot',
      'thumbnailUrl',
      'contentUrl',
      'downloadUrl'
    ]
  };

const URL_EXCLUDE = /^mailto:/;

function PugBundler(options = {}) {
  const assets = [
    ...(options.assets || []),
    //require("./PugCompileAsset"),
    require("./PugAsset"),
    require("./SassAsset"),
    require("./RawAsset")
  ];
   
  const exclude = new Set(),
    outPath = path.resolve(process.cwd(), options.outPath || "dist");
  if (options.exclude) {
    for (const exclusion of options.exclude) {
      const normalized = path.normalize(path.resolve(exclusion)),
        stats = fs.statSync(normalized);
      if (stats.isFile()) {
        exclude.add(normalized);
      } else if (stats.isDirectory()) {
        for (const subFile of recursiveReadSync(normalized)) {
          exclude.add(path.normalize(path.resolve(subFile)));
        }
      }
    }
  }
  /*const {files} = {
    files: [],
    ...options
  };*/
  let {basePath} = options;

  this.handleWrite = function handleWrite(file) {
    if (options.handleWrite) {
      const result = options.handleWrite(file);
      if (result !== undefined) {
        return result
      }
    }
    const finalPath = path.resolve(basePath, outPath, path.relative(basePath, file.path));
    fs.mkdirSync(path.dirname(finalPath), {recursive: true});
    fs.writeFileSync(finalPath, file.contents);
    return finalPath;
  }

  this.registerAndRename = function registerAndRename(relativeFilePath, currentBasePath) {
    if (!basePath) {
      basePath = currentBasePath;
    }
    let filePath;
    if (relativeFilePath[0] === "/") {
      if (relativeFilePath === "/") {
        return relativeFilePath;
      }
      filePath = path.resolve(basePath, relativeFilePath.slice(1));
    } else {
      filePath = path.resolve(currentBasePath, relativeFilePath)
    }
    const asset = assets.find(asset => asset.regex.test(filePath)),
      dirname = path.dirname(filePath),
      basename = path.basename(filePath),
      rename = asset.rename(relativeFilePath),
      normalizedFilePath = path.normalize(filePath);
    if (!exclude.has(normalizedFilePath)) {
      exclude.add(normalizedFilePath)
      for (const file of asset.transform({filePath, basePath, relativePath: relativeFilePath, currentBasePath, dirname, basename, bundler: this, options: options[asset.name] || {}})) {
        const resultingPath = this.handleWrite({type: asset.name, ...file});
        console.log(`${filePath} => ${resultingPath}`)
      }
    }
    return rename;
  }

  this.postLex = function postLex(value, pugOptions) {
    //Object.assign(this, pugOptions);
    if (value[0]) {
      const currentBasePath = path.dirname(value[0].loc.filename);
      if (!basePath) {
        basePath = currentBasePath;
      }
      let tag,
          meta = false;
      for (const token of value) {
          switch (token.type) {
              case "tag":
                  tag = token.val;
                  break;
              case "attribute":
                  if (meta && token.name === "content") {
                      meta = false;
                      //console.log(value[0].loc.filename);
                      let val = tryEval(token.val);
                      if (val && !val.includes("://") && !URL_EXCLUDE.test(val)) {
                        token.val = "'"+this.registerAndRename(processURL(val), currentBasePath)+"'";
                      }
                  } else if (tag === "meta" && META[token.name] && tryEval(token.val) && META[token.name].includes(tryEval(token.val))) {
                    meta = true;
                  } else if (ATTRS[token.name] && ATTRS[token.name].includes(tag)) {
                    //console.log(value[0].loc.filename);
                    let val = tryEval(token.val);
                    if (val && !val.includes("://") && !URL_EXCLUDE.test(val)) {
                      token.val = "'"+this.registerAndRename(processURL(val), currentBasePath)+"'";
                    }
                  }
                  break;
          }
      }
    }
    return value;
  }

  function processURL(url) {
    return url.replace(/((#|\?).*)$/, "");
  }

  function tryEval(code) {
    try {
      return nodeEval(code, null, options.pug.locals); // TODO: NEEDS TESTING
    } catch (e) {
      //console.warn(e);
    }
  }

  this.handleFile = function handleFile(filePath) {
    const resolvedPath = path.resolve(filePath);
    this.registerAndRename(path.basename(resolvedPath), path.dirname(resolvedPath));
  }

  if (options.files) {
    for (const file of options.files) {
      const stats = fs.statSync(file);
      if (stats.isFile()) {
        this.handleFile(file);
      } else if (stats.isDirectory()) {
        for (const subFile of recursiveReadSync(file)) {
          this.handleFile(subFile);
        }
      }
    }
  }

}

module.exports = exports = PugBundler;
