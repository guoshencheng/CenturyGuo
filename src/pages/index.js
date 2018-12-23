import React from 'react';
import Link from 'gatsby-link';
import { PressStart2P, chars } from '../components/PressStart2P';
import MediaQuery from 'react-responsive';
import MashRoom from '../components/mashroom';
import './index.less';

const C = chars.C;

const IndexPage = ({ siteTitle }) => (
  <table className="home-page-container">
    <tbody>
      <tr>
        <td>
          <div className="home-page">
            <MediaQuery minDeviceWidth={480}>
              <div className="home-title">
                <PressStart2P str="Century's World" size={35} color="white"/>
              </div>
            </MediaQuery>
            <MediaQuery maxDeviceWidth={480}>
              <div className="home-title">
                <C size="35" color="white" />
                <PressStart2P str="entury's" size={30} color="white"/>
                <div>
                  <PressStart2P str="World" size={30} color="white"/>
                </div>
              </div>
            </MediaQuery>
            <div className="mashroom-container">
              <MashRoom />
            </div>
            <div className="operations">
              <Link to="/posts">
                <PressStart2P str="POSTS" charWidth={1.1} size={15} color="white"/>
              </Link>
              <a target="_blank" href="https://github.com/guoshencheng">
                <PressStart2P str="GITHUB" charWidth={1.1} size={15} color="white"/>
              </a>
            </div>
          </div>
        </td>
      </tr>
    </tbody>
  </table>
)

export default IndexPage
