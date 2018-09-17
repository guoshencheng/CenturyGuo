import React from 'react';
import Link from 'gatsby-link';
import MashRoom from '../components/mashroom';
import './index.less';

const IndexPage = ({ siteTitle }) => (
  <table className="home-page-container">
    <tbody>
      <tr>
        <td>
          <div className="home-page">
            <div className="game-text home-title">
              Century's World
            </div>
            <div className="mashroom-container">
              <MashRoom />
            </div>
            <div className="operations game-text">
              <Link to="/posts">
                Posts
              </Link>
              <Link to="">
                Tips
              </Link>
              <a target="_blank" href="https://github.com/guoshencheng">
                github
              </a>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
)

export default IndexPage
