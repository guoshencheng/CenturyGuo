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

const array = [];

mashroom.forEach((items, row) => {
  items.forEach((item, col) => {
    const reverse =  row % 2 === 0;
    if (!!item) {
      array.push({
        col, row,
        x: size => size * col,
        y: size => size * row,
        deep: reverse ? !(col % 2 === 0) : (col % 2 === 0),
        animationDelay: -((row * items.length + col) * 0.05) + 's' 
      })
    }
  })
})

export default ({ size, ...restProps }) => (
  <div className="mashroom">
    <svg 
      className="mashroom-icon" 
      viewBox="0 0 80 80"
      {...restProps}
    >
      {
        array.map(i => (
          <rect 
            key={`${i.col}-${i.row}`}
            x={i.x(10)}
            y={i.y(10)}
            width={10} 
            height={10}
            rx={1.5}
            rx={1.5}
            style={{
              animationDelay: i.animationDelay,
              fill: i.deep ? 'rgba(253,209,14,.7)' : 'rgba(253,209,14,.6)',
              stroke: 'none'
            }}
          />
        ))
      }
    </svg>
  </div>
)