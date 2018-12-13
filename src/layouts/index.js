import React from 'react'
import PropTypes from 'prop-types'
import Helmet from 'react-helmet'
import classnames from 'classnames';

import Header from '../components/header'
// import '../atom-one-dark.css'
import '../github-markdown.css'
import './index.less'


const Layout = ({ children, data, location }) => {
  return (
    <div>
      <Helmet
        title={data.site.siteMetadata.title}
        meta={[
          { name: 'description', content: 'Sample' },
          { name: 'keywords', content: 'sample, something' },
        ]}
      />
      {
        location.pathname !== '/' 
        && <Header siteTitle={data.site.siteMetadata.title} />
      }
      <div className={classnames('container', { 'with-header': location.pathname !== '/' })}>
        {children()}
      </div>
    </div>
  )
}

Layout.propTypes = {
  children: PropTypes.func,
}

export default Layout

export const query = graphql`
  query SiteTitleQuery {
    site {
      siteMetadata {
        title
      }
    }
  }
`
