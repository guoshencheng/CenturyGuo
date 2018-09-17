import React from 'react';
import Link from 'gatsby-link';
import MashRoom from '../components/mashroom';
import './index.less';

const IndexPage = () => (
  <div className="home-page">
    <h1 className="game-text">
      Century's World
    </h1>
    <div className="mashroom-container">
      <MashRoom />
    </div>
    <div className="operations game-text">
      <a href="">
        Post
      </a>
      <a href="">
        Tips
      </a>
      <a href="">
        Github
      </a>
    </div>
  </div>
)

export default IndexPage
