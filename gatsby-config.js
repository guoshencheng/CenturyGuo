const path = require('path');

const filesystemPlugin = [{
  resolve: 'gatsby-source-filesystem',
  options: {
    name: 'src',
    path: path.resolve(__dirname, './docs'),
  }
}]

if (process.env.NODE_ENV === 'development') {
  filesystemPlugin.push({
    resolve: 'gatsby-source-filesystem',
    options: {
      name: 'plan',
      path: path.resolve(__dirname, './plan'),
    }
  })
}

module.exports = {
  siteMetadata: {
    title: 'Century\'s world',
    author: 'guoshencheng@gmail.com',
    description: 'guoshencheng\'s personal website',
    siteUrl: 'https://guoshencheng.com',
    keywords: 'century guo guoshencheng',
  },
  plugins: [
    'gatsby-plugin-sitemap',
    'gatsby-plugin-react-helmet',
    {
      resolve: 'gatsby-transformer-remark',
      options: {
        plugins: [{
          resolve: 'gatsby-remark-prismjs',
          options: {
            classPrefix: "language-",
            inlineCodeMarker: null,
            aliases: {},
          }
        }]
      }
    },
    'gatsby-plugin-less',
    ...filesystemPlugin,
    'gatsby-plugin-remove-trailing-slashes',
    {
      resolve: `gatsby-plugin-manifest`,
      options: {
        name: `Century's World`,
        short_name: `Century's World`,
        start_url: `/`,
        background_color: `#ffffff`,
        theme_color: `#52a260`,
        display: `minimal-ui`,
        icon: `./src/assets/icon.png`,
      },
    },
    {
      resolve: `gatsby-plugin-google-analytics`,
      options: {
        trackingId: "UA-57905169-2",
      },
    },
  ],
}
