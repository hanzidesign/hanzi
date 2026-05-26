module.exports = function loadGlslSource(source) {
  const shaderSource = Buffer.isBuffer(source) ? source.toString('utf8') : source

  return `const source = ${JSON.stringify(shaderSource)}\nexport default source\n`
}
