const PugBundler = require("../src/PugBundler");

const bundler = new PugBundler({
  files: [
    "src"
    "src/index.pug",
    "src/about-us.pug",
    "src/portfolio.pug",
    "src/contact.pug"
  ],
  exclude: [
    "src/.pugrc",
    "src/templates"
  ],
  assets: [
    require("./PugCompileAsset")
  ],
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
