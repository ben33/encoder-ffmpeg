import fs from 'fs-extra'
import fluentFfmpeg from 'fluent-ffmpeg'

import eventBus from './eventBus'
import ffmpeg from './ffmpeg'
import fileExtension from 'file-extension'

const videoExtensions = ['mkv', 'm2ts']
const videosToEncodeFolder = process.env.ROOT_FOLDER_VIDEOS ? process.env.ROOT_FOLDER_VIDEOS : '/videos-to-encode'


export default (command) => {
    this.selectPathHandler = {
        handle: (command) => {
            const files = []
            const path = videosToEncodeFolder + command.path

            fs.readdir(path, (err, filesListed) => {
                if (filesListed) {
                    filesListed.forEach(fileName => {
                        const file = path + fileName
                        let stats = fs.lstatSync(file)
                        if (stats.isFile()) {
                            if (videoExtensions.indexOf(fileExtension(file)) !== -1) {
                                files.push({ name: fileName, isDirectory: stats.isDirectory(), path: file.replace(videosToEncodeFolder, '') })
                            }
                        } else {
                            files.push({ name: fileName, isDirectory: stats.isDirectory() })
                        }
                    })
                }
                eventBus.publish({ payload: {files} }, { key: 'ui.filesToShow' })
            })
        }
    }

    this.selectVideoHandler = {
        handle: ({ video }) => {
            const filePath = videosToEncodeFolder + video
            fs.pathExists(filePath)
                .then(fileExists => {
                    if (fileExists) {
                        fluentFfmpeg.ffprobe(filePath, function (err, metadata) {
                            if (err) {
                                eventBus.publish({ payload: {err} }, { key: 'selectVideoFailed' })
                            }
                            eventBus.publish({ video: filePath, metadata }, { key: 'ui.videoSelected' })
                        })
                    } else {
                        const err = new Error()
                        err.message = 'File does not exist: ' + video
                        eventBus.publish({ payload: err }, { key: 'selectVideoFailed' })
                    }
                })
        }
    }
    
    this.startEncodingHandler = {
        handle: (command) => {
            const { input, options, output, } = command.video
            fluentFfmpeg(videosToEncodeFolder + input)
                .outputOptions(ffmpeg.convertUIOptionsIntoFFMPEGOptions(options))
                .on('start', () => {
                    console.log('start')
                    eventBus.publish({ payload: { video: command.video } }, { key: 'ui.encoderStarted' })
                })
                .on('progress', (progress) => {
                    eventBus.publish({ payload: { progress, video: command.video } }, { key: 'ui.encoderProgressed' })
                })
                .on('end', () => {
                    console.log('finished')
                    eventBus.publish({ key: 'ui.encoderFinished' })
                })
                .on('error', (error) => {
                    console.log(error)
                    eventBus.publish({ payload: error }, { key: 'encoderFailed' })
                })
                .save(videosToEncodeFolder + output)
        }
    }

    return this[command + 'Handler']
}