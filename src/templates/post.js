import React from 'react';
import Link from 'gatsby-link';
import { graphql } from 'gatsby';
import './post.less';
import { DiscussionEmbed } from "disqus-react";
import Layout from '../components/layout';
require("prismjs/themes/prism-tomorrow.css")

export default class Post extends React.Component {
  render() {
    const { data } = this.props;
    const post = data.markdownRemark;
    const { tag } = post.frontmatter;
    const excerpt = post.excerpt;
    const tags = tag ? tag.split(',') : '';
    const disqusShortname = "guoshencheng";
    const disqusConfig = {
      identifier: post.id,
      title: post.frontmatter.title,
    };
    return (
      <Layout
        title={post.frontmatter.title}
        keywords={tag}
        description={excerpt}
        showHeader
      >
        <div className="post-container">
          <div className="post-title">
            {post.frontmatter.title}
          </div>
          <div className="extra-info">
            <span className="post-date">
              {post.frontmatter.date} 
            </span>
            <span className="post-tag">
              {
                tags.map(t => (
                  <Link key={t} to={`/posts/${t}`}>{t}</Link>
                ))
              }
            </span>
          </div>
          <div className="markdown-body">
            <div dangerouslySetInnerHTML={{ __html: post.html }} />
          </div>
          <DiscussionEmbed shortname={disqusShortname} config={disqusConfig} />
        </div>
      </Layout>
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
        tag
      }
      excerpt
    }
  }
`;