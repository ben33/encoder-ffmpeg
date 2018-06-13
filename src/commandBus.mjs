import bus from './bus'

const exchange  = bus.topic('command', {durable: true})

export default exchange