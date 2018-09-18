import React from 'react'
import Link from 'gatsby-link'
import graphql from 'graphql'
import './posts.less';

const Posts = ({ data }) => (
  <div>
    <div className="posts-list">
    {
      data.allMarkdownRemark.edges.map(i => i.node).map(node => (
        <div className="post-item" key={node.id}>
          <div className="post-item-title">
            <Link to={`/posts/${node.fields.slug}`}>
              {node.frontmatter.title}
            </Link>
          </div>
          <div className="post-item-base-info">
            {node.frontmatter.date}
          </div>
          <div className="post-item-desc">
            {node.excerpt}
          </div>
        </div>
      ))
    }
    </div>
  </div>
)

export const query = graphql`
query AllMarkdownRemakSchema($tag: String) {
  allMarkdownRemark(
    sort: {
    	fields: [frontmatter___date]
      order: DESC
  	},
    filter: {
      frontmatter: {
        tag: {
          regex: $tag
        }
      }
    }
  ) {
    totalCount
    edges {
      node {
        id
        frontmatter {
          title
          date(formatString: "DD MMMM, YYYY")
        }
        fields {
          slug
        }
        excerpt
      }
    }
  }
}
`

export default Posts;