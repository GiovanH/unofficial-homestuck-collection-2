const sync_responses = {
    GET_AVAILABLE_MODS: []
}

module.exports = {
    on(event, fn) {
        console.error("fakeIpc discarding on event:", event)
    },
    invoke(command, opts) {
        console.error("fakeIpc discarding invoked command:", command, opts)
    },
    send(command, opts) {
        console.error("fakeIpc discarding sent command:", command, opts)
    },
    sendSync(command) {
        if (sync_responses[command]) {
            return sync_responses[command]
        } else {
            console.error("fakeIpc has no resposne for sendSync:", command)
        }
    }
}

