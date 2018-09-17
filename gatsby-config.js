const path = require('path');

module.exports = {
  siteMetadata: {
    title: 'Century\'s world',
  },
  plugins: [
    'gatsby-plugin-react-helmet',
    'gatsby-transformer-remark',
    'gatsby-plugin-less',
    {
      resolve: 'gatsby-source-filesystem',
      options: {
        name: 'src',
        path: path.resolve(__dirname, './docs'),
      }
    },
    'gatsby-plugin-remove-trailing-slashes',
  ],
}
