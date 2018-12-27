const { createFilePath } = require(`gatsby-source-filesystem`);
const path = require('path');

exports.onCreateNode = ({ node, actions, getNode }) => {
  const { createNodeField } = actions
  if (node.internal.type === `MarkdownRemark`) {
    const slug = createFilePath({ node, getNode, basePath: `pages` })
    createNodeField({
      node,
      name: `slug`,
      value: slug.replace(/\//g, ''),
    })
  }
}

exports.createPages = ({ graphql, actions }) => {
  const { createPage } = actions
  return new Promise((resolve, reject) => {
    graphql(`
      {
        allMarkdownRemark {
          edges {
            node {
              frontmatter {
                tag
              }
              fields {
                slug
              }
            }
          }
        }
      }
    `).then(result => {
      const set = new Set();
      result.data.allMarkdownRemark.edges.forEach(({ node }) => {
        const { tag } = node.frontmatter;
        const tags = tag.split(',');
        tags.forEach(t => set.add(t));
      })
      const tags = Array.from(set);
      tags.forEach(t => {
        createPage({
          path: `/posts/${t}`,
          component: path.resolve(`./src/pages/posts.js`),
          context: {
            tag: `/${t}/`
          }
        })
      })
      result.data.allMarkdownRemark.edges.forEach(({ node }) => {
        createPage({
          path: `/posts/${node.fields.slug}`,
          component: path.resolve(`./src/templates/post.js`),
          context: {
            // Data passed to context is available in page queries as GraphQL variables.
            slug: node.fields.slug,
          },
        })
      })
      resolve()
    })
  })
}