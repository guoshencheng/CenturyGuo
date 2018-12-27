import React from 'react'
import Helmet from 'react-helmet'
import classnames from 'classnames';
import { StaticQuery, graphql } from 'gatsby';

import Header from '../components/header'
// import '../atom-one-dark.css'
import '../github-markdown.css'
import './layout.less'

export const query = graphql`
  query SiteTitleQuery {
    site {
      siteMetadata {
        title
        author
        description
        siteUrl
      }
    }
  }

`

const Layout = ({ children, showHeader }) => (
  <StaticQuery
    query={query}
    render={data => (
      <div>
        <Helmet
          title={data.site.siteMetadata.title}
          meta={[
            { name: 'description', content: 'Sample' },
            { name: 'keywords', content: 'sample, something' },
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

