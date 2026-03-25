function visitElement(node, fn) {
  if (node.type === 'element') fn(node)
  if (node.children) {
    for (const child of node.children) {
      visitElement(child, fn)
    }
  }
}

export default function rehypeCodeMeta() {
  return (tree) => {
    visitElement(tree, (node) => {
      if (node.tagName === 'pre') {
        const code = node.children?.[0]
        if (code?.tagName === 'code' && code.data?.meta) {
          const match = code.data.meta.match(/title="([^"]+)"/)
          if (match) {
            node.properties['data-title'] = match[1]
          }
        }
      }
    })
  }
}
