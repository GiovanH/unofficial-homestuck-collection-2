

module.exports = {
    has(key) {
        return (null != localStorage.getItem(key))
    },
    get(key) {
        // if (key == 'localData') {
        //     return Object.entries(localStorage).reduce((acc, i) => {
        //         try {
        //             acc[i[0]] = JSON.parse(i[1])
        //         } catch {}
        //         return acc
        //     }, {})
        // } else {
            value = JSON.parse(localStorage.getItem(key))
            console.log("getting", key, value)
            return value
        // }
    },
    set(key, value) {
        // if (key == 'localData') {
        //     Object.entries(value).forEach((i) => {
        //         console.log("setting", i[0], i[1])
        //         localStorage.setItem(i[0], JSON.stringify(i[1]))
        //     })
        // } else {
            // key = key.replace('localData.', '')
            // console.log("setting", key, value)
            localStorage.setItem(key, JSON.stringify(value))
        // }
    }
}

