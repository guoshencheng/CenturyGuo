import React from 'react'
import Link from 'gatsby-link'
import { PressStart2P } from './PressStart2P';
import './header.less'

const Header = ({ siteTitle }) => (
  <div
    className="header"
  > 
    <div className="header-title-container">
      <div className="header-logo" />
      <div className="header-title game-text">
        <Link to="/">
          <PressStart2P str={siteTitle} size={15} color="rgba(0, 0, 0, 0.6)"/>
        </Link>
      </div>
    </div>
    <div className="header-line-item header-link">
      <Link to="/">
        <PressStart2P str="POSTS" size={15} color="rgba(0, 0, 0, 0.6)"/>
      </Link>
    </div>
  </div>
)

export default Header
