import commandBus from './commandBus'
import handler from './commandHandlers'

commandBus
    .queue({ exclusive: true, key: 'encoder.*' })
    .consume((command, ack) => {
        ack()
        handler(command.type).handle(command)
    })
