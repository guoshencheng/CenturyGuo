

exports.onCreateNode = ({ node }) => {
  if (node.internal.type === 'MarkdownRemark') {
    // console.log(node);
  }
}

exports.createPages = (...args) => {
  console.log(...args);
}