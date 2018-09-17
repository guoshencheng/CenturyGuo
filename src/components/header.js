import React from 'react'
import Link from 'gatsby-link'
import './header.less'

const Header = ({ siteTitle }) => (
  <div
    className="header"
  > 
    <div className="header-title-container">
      <div className="header-logo" />
      <div className="header-title game-text">
        <Link to="/">{siteTitle}</Link>
      </div>
    </div>
    <div class="header-line-item game-text header-link">
      <Link to="/">Posts</Link>
    </div>
  </div>
)

export default Header
