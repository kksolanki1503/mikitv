Object.defineProperty(exports, "__esModule", {
  value: true,
});
if (process.env.NODE_ENV == "development") {
  exports.default = {
    // websiteURL: "https://localhost:3000/",
    // baseURL: "https://crxinsider.com/api",
    // imageURL: "https://team.thebestdeals.app/tbd_images",
    baseUrl: "http://localhost:5200",
    // backendURL: "http://localhost:5900/api",
    // backendURL2: "http://localhost:5900/sitemaps/",
  };
} else {
  exports.default = {
    // websiteURL: "https://www.crxinsider.com/",
    baseUrl: "https://mikitv.fun",
    // imageURL: "https://team.thebestdeals.app/tbd_images",
    // imageURL: "https://cdn.crxinsider.com/,
    // baseURL: "http://localhost:5300/api"
    // backendURL: "https://www.crxinsider.com/api",
    // backendURL2: "https://www.crxinsider.com/sitemaps/",
  };
}
