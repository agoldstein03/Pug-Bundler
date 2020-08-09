# Pug-Bundler
An extensible bundler that integrates with the internals of the Pug compiler.

https://github.com/agoldstein03/Pug-Bundler

I was trying to figure out how to compile my Pug (an HTML templating engine and preprocessor) files into functions that I could use later to render those pages with values that would be inputted later. This sort of compilation to a JS function is a feature integral to Pug. However, the current workflow I was using also involved some SASS files. These files would be compiled and renamed by the Parcel bundler, and all the references to those files would be renamed accordingly. When I tried to make these work together, I was dumbfounded. The way that Pug implements plugins (which is mostly undocumented; I determined how they work by looking through the source code and reverse engineering their implementation) is completely incompatible with how those sorts of bundlers work. The bundlers did not know how to work with finding the resources referenced by a Pug file. They would instead compile and render the Pug file to HTML and then look through that to determine what resources were referenced. However, they could not handle the Pug file correctly if it cannot be rendered until later.

So, I wrote my own bundler from scratch. It is highly extensible but also has a lot of out-of-the-box functionality. It interfaces with the Pug compiler right after the Pug file is lexed into an AST. It searches this AST for references to other files, which it then processes according to the given types of assets. Dealing with Pug and Sass are built in (with a default raw asset type that keeps the files the same), but other asset types can easily be added.

Here are some examples. You are encouraged to try these for yourself. A test website can be found in the test/src directory. Presume that PugBundler is the PugBundler.js module:
```javascript
new PugBundler({
  files: [
    "src/index.pug"
  ]
})
```

The above code would start with the `index.pug` file inside of the `src` folder. It would compile and render the pug, compile the sass, and copy the neccesary directory structure over to a `dist` folder, referencing the first file's parent folder (in this case, `src/index.pug` has the parent folder `src`) as the base path to reference against the destination folder. These defaults can be easily changed:
```javascript
new PugBundler({
  files: [
    "src/index.pug"
  ],
  outPath: "public",
  basePath: "src"
})
```

Compiler options are easy to specify as well, and are passed to the assets for use. To pass an asset handler options to be given to the compiler, simply reference the name of that type of asset:
```javascript
new PugBundler({
  files: [
    "src/index.pug"
  ],
  sass: { // Sass compiler options
    includePaths: ["../node_modules"]
  },
  pug: { // Pug compiler options, including locals
    pretty: true,
    title: "WebPoint",
    links: [
      ["Home", "/"],
      ["About Us", "/about-us.pug"],
      ["Portfolio", "/portfolio.pug"],
      ["Contact Us", "/contact.pug"]
    ]
  }
})
```

Multiple files can be given:
```javascript
new PugBundler({
  files: [
    "src/index.pug",
    "src/about-us.pug",
    "src/portfolio.pug",
    "src/contact.pug"
  ]
})
```

Or entire directories at once (which will include all files inside of subfolders, recursively):

```javascript
new PugBundler({
  files: [
    "src"
  ]
})
```

Or both:
```javascript
new PugBundler({
  files: [
    "src/index.pug",
    "src/images"
  ]
})
```

Files or whole directories can be excluded from the whole process:
```javascript
new PugBundler({
  files: [
    "src"
  ],
  exclude: [
    "src/.pugrc",
    "src/templates"
  ],
  ]
})
```

The most powerful part, however, are the custom assets. The following is a definition for a Raw Asset, a file that does not need to be changed:
```javascript

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
```

As can be seen above, all that is required to make a custom asset is a name, a regex to identify the file type, a renaming function (for example, to rename `.sass` files to `.css`) and a transform function that is passed the following data:
```javascript
{
  filePath : string, // The path to the file in question
  basePath : string, // The base path of the current compilation
  relativeFilePath : string, // The path of the file in question relative to the file that references it
  currentBasePath : string,  // The path to the file that references the file in question
  dirname : string, // The path to the folder holding the file in question
  basename : string, // The name and extension of the file in question
  bundler : PugBundler, // The bundler itself, for recursive calls
  options : Object // The options for that specific asset
}
```

An asset to compile and render Pug, with dependencies tracked:
```javascript
'use strict';

/*!
 * Pug Bundler: Pug Asset
 * Copyright(c) 2020 Adam Goldstein <agoldstein03@gmail.com>
 * MIT Licensed
 */

const pug = require("pug");

exports.name = "pug";
const regex = exports.regex = /(^.*)\.pug$/;

function rename(filePath) {
  return filePath.replace(regex, "$1.html");
}
exports.rename = rename;

exports.transform = function transform(data) {
  return [{
    path: rename(data.filePath),
    contents: pug.renderFile(data.filePath, {
      filename: data.filePath,
      basedir: data.basePath,
      ...data.options,
      plugins: [data.bundler, ...(data.options.plugins || [])],
    })
  }];
}
```

And the whole reason why this was even started; an asset to compile but NOT render Pug files:
```javascript
'use strict';

/*!
 * Pug Bundler: Pug Compile Asset
 * Copyright(c) 2020 Adam Goldstein <agoldstein03@gmail.com>
 * MIT Licensed
 */

const pug = require('pug');

exports.name = "pug";
const regex = exports.regex = /(^.*)\.pug$/;

function rename(filePath) {
  return filePath.replace(regex, "$1.pug.js");
}
exports.rename = rename;

exports.transform = function transform(data) {
  return [{
    path: rename(data.filePath),
    contents: pug.compileFileClient(data.filePath, {
      filename: data.filePath,
      basedir: data.basePath,
      compileDebug: false,
      ...data.options,
      plugins: [data.bundler, ...(data.options.plugins || [])],
    })
  }];
}
```

As you can see, writing custom assets is extremely easy and concise. Using these assets is even easier:
```javascript
new PugBundler({
  files: [
    "src/index.pug"
  ],
  assets: [
    require("./PugCompileAsset")
  ]
})
```

The above code converts the Pug files to `.pug.js` files that contain the JS code needed to render the page, keeping track of dependencies as needed and copying them over as well. Any assets you specify (like is done above) will automatically take precedence over the built-in assets. They are evaluated in order of highest to lowest priority, so the following (for example) would treat all assets as raw assets and simply copy them over to the destination folder:
```javascript
new PugBundler({
  files: [
    "src"
  ],
  assets: [
    require("./RawAsset")
  ]
})
```

The SASS asset was one of the more difficult parts of the project, as it required finding a suitable way to find CSS dependencies. I ended up using `css-tree` to walk through the AST of the CSS compiled from the Sass file and find all of the referenced files. They were then passed to the `registerAndRename` function of the PugBundler, which processes the individual files.

Overall, the project was a great success. I will be using this in multiple projects in the future, as it ended up being much easier to customize than many of the more well-established toolkits that are out there, and it can interface with the Pug compiler directly. 