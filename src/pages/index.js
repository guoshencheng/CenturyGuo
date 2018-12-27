import React from 'react';
import Link from 'gatsby-link';
import { PressStart2P } from '../components/PressStart2P';
import Layout from '../components/layout';
import MashRoom from '../components/mashroom';
import './index.less';

const IndexPage = ({ siteTitle }) => (
  <Layout>
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
                <a target="_blank" rel="noopener noreferrer" href="https://github.com/guoshencheng">
                  <PressStart2P str="GITHUB" color="white"/>
                </a>
              </div>
            </div>
          </td>
        </tr>
      </tbody>
    </table>
  </Layout>
)

export default IndexPage
