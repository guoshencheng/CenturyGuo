import React from 'react'
import Link from 'gatsby-link'
import graphql from 'graphql'

const SecondPage = ({ data }) => (
  <div>
    <div className="posts-list">
    {
      data.allMarkdownRemark.edges.map(i => i.node).map(node => (
        <div className="post-item" key={node.id}>
          <div className="post-item-title">
            {node.frontmatter.title}
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
query AllMarkdownRemakSchema {
  allMarkdownRemark {
    totalCount
    edges {
      node {
        id
        frontmatter {
          title
          date(formatString: "DD MMMM, YYYY")
        }
        excerpt
      }
    }
  }
}
`

export default SecondPage;