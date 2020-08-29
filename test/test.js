const fs = require("fs"),
  PugBundler = require("../src/PugBundler");

const files = [];

const bundler = new PugBundler({
  files: [
    "src"
    /*"src/index.pug",
    "src/about-us.pug",
    "src/portfolio.pug",
    "src/contact.pug"*/
  ],
  exclude: [
    "src/.pugrc",
    "src/templates"
  ],
  assets: [
    require("../src/PugCompileAsset")
  ],
  handleWrite: file => {
    if (file.type === "pug") {
      files.push({path: file.path, contents: file.contents.toString()});
    }
  },
  sass: {
    includePaths: ["../node_modules"]
  },
  pug: {
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

fs.writeFileSync("dist/out.json", JSON.stringify(files));