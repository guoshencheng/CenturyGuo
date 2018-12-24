import React from 'react';
import Link from 'gatsby-link';
import { PressStart2P, chars } from '../components/PressStart2P';
import MashRoom from '../components/mashroom';
import './index.less';

const C = chars.C;

const IndexPage = ({ siteTitle }) => (
  <table className="home-page-container">
    <tbody>
      <tr>
        <td>
          <div className="home-page">
            <div className="mashroom-container">
              <MashRoom />
            </div>
            <div className="home-title">
              <PressStart2P str="Century's World" color="white"/>
            </div>
            <div className="operations">
              <Link to="/posts">
                <PressStart2P str="POSTS" color="white"/>
              </Link>
              <a target="_blank" href="https://github.com/guoshencheng">
                <PressStart2P str="GITHUB" color="white"/>
              </a>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
)

export default IndexPage
