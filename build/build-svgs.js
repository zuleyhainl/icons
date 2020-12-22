#!/usr/bin/env node

'use strict'

const fs = require('fs').promises
const path = require('path')
const chalk = require('chalk')
const cheerio = require('cheerio')
const SVGO = require('svgo')
const yaml = require('js-yaml')

const iconsDir = path.join(__dirname, '../icons/')

const VERBOSE = process.argv[2] === '--verbose'

const svgAttributes = {
  xmlns: 'http://www.w3.org/2000/svg',
  width: '16',
  height: '16',
  fill: 'currentColor',
  class: '',
  viewBox: '0 0 16 16'
}

const getSvgoConfig = async () => {
  try {
    let svgoConfig = await fs.readFile(path.join(__dirname, '../svgo.yml'), 'utf8')

    svgoConfig = await yaml.safeLoad(svgoConfig)

    return svgoConfig
  } catch (error) {
    console.error('Couldn\'t read SVGO\'s config!')
    console.error(error)
    process.exit(1)
  }
}

const processFile = (file, config) => new Promise((resolve, reject) => {
  file = path.join(iconsDir, file)

  fs.readFile(file, 'utf8')
    .then(data => {
      const svgo = new SVGO(config)

      svgo.optimize(data)
        .then(result => {
          const $ = cheerio.load(result.data, {
            xml: {
              xmlMode: true
            }
          })
          const $svg = $('svg')

          $svg.replaceWith($('<svg>').append($(this).html()))

          for (const [attribute, value] of Object.entries(svgAttributes)) {
            $svg.removeAttr(attribute)
            $svg.attr(attribute, value)
          }

          $svg.attr('class', `bi bi-${path.basename(file, '.svg')}`)

          fs.writeFile(file, $svg.toString().replace(/\r\n?/g, '\n'), 'utf8')
            .then(() => {
              if (VERBOSE) {
                console.log(`- ${path.basename(file, '.svg')}`)
              }
              resolve()
            })
            .catch(error => reject(error))
        })
        .catch(error => reject(error))
    })
    .catch(error => reject(error))
})

const main = async () => {
  const basename = path.basename(__filename)
  const timeLabel = chalk.cyan(`[${basename}] finished`)

  console.log(chalk.cyan(`[${basename}] started`))
  console.time(timeLabel)

  const files = await fs.readdir(iconsDir)
  const config = await getSvgoConfig()

  await Promise.all(files.map(file => processFile(file, config)))

  console.log(chalk.green(`\nSuccess, ${files.length} icons prepped!`))
  console.timeEnd(timeLabel)
}

main()
