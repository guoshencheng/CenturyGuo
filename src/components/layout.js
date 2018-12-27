import React from 'react'
import Helmet from 'react-helmet'
import classnames from 'classnames';
import { StaticQuery, graphql } from 'gatsby';

import Header from '../components/header'
// import '../atom-one-dark.css'
import '../github-markdown.css'
import './layout.less'

const query = graphql`
  query SiteTitleQuery {
    site {
      siteMetadata {
        title
        author
        description
        siteUrl
        keywords
      }
    }
  }

`

const Layout = ({ children, showHeader, keywords, title }) => (
  <StaticQuery
    query={query}
    render={data => (
      <div>
        <Helmet
          title={title ? `${data.site.siteMetadata.title} - ${title}` : data.site.siteMetadata.title}
          script={[{
            src: 'https://zz.bdstatic.com/linksubmit/push.js'
          }]}
          meta={[
            { name: 'description', content: data.site.siteMetadata.description },
            { name: 'keywords', content: keywords || data.site.siteMetadata.keywords || '' },
            {
              property: 'og:title',
              content: title || data.site.siteMetadata.title,
            },
            {
              name: 'og:description',
              content: data.site.siteMetadata.description,
            },
          ]}
        />
        {
          showHeader
          && <Header siteTitle={data.site.siteMetadata.title} />
        }
        <div className={classnames('container', { 'with-header': showHeader })}>
          {children}
        </div>
      </div>
    )}
  />
) 

export default Layout

