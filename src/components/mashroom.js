import React from 'react';
import classnames from 'classnames'

import './mashroom.less';

const mashroom = [
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [1, 1, 1, 1, 1, 1, 1, 1],
  [0, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
  [0, 0, 1, 1, 1, 1, 0, 0],
]

export default () => (
  <div className="mashroom">
  {
    mashroom.map((line, index) => {
      const reverse = index % 2 === 0;
      return (
        <div className="mashroom-item-line" key={index}>
          {
            line.map((item, i) => {
              if (Number(item) === 0) {
                return <div className="mashroom-item blank" key={i} />;
              } else {
                return (
                  <div 
                    key={i}
                    className={classnames('mashroom-item', {
                      deep: reverse ? !(i % 2 === 0) : (i % 2 === 0),
                    })} 
                    style={{ 
                      animationDelay: -((index * line.length + i) * 0.1) + 's' 
                    }}
                  />
                )
              }
            })
          }
        </div>
      )
    })
  }
  </div>
)