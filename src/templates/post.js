import React from 'react';
import highlight from 'highlight.js';
import './post.less';

export default class Post extends React.Component {
  render() {
    const { data } = this.props;
    const post = data.markdownRemark;
    return (
      <div className="post-container">
        <div className="post-title">
          {post.frontmatter.title}
        </div>
        <div className="post-date">
          {post.frontmatter.date}
        </div>
        <div className="markdown-body">
          <div dangerouslySetInnerHTML={{ __html: post.html }} />
        </div>
      </div>
    );
  }
}

export const query = graphql`
  query BlogPostQuery($slug: String!) {
    markdownRemark(fields: { slug: { eq: $slug } }) {
      html
      frontmatter {
        title
        date(formatString: "DD MMMM, YYYY")
      }
    }
  }
`;