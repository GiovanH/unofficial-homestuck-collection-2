window.webAppAssetDir = "http://localhost:8000/"
// window.webAppAssetDir = "https://filedn.com/lANSiYhDVpD4ou6Gt17Ij9m/AssetPackV2Lite/"

function loadArchiveData() {
  const assetDir = "L:/Archive/Homestuck/TUHC/AssetPackV2Lite/"

  let data;
  data = {
    ...require('P:/Public Folder/AssetPackV2Lite/archive/data/version.json'),
    mspa: require('P:/Public Folder/AssetPackV2Lite/archive/data/mspa.json'),
    social: require('P:/Public Folder/AssetPackV2Lite/archive/data/social.json'),
    news: require('P:/Public Folder/AssetPackV2Lite/archive/data/news.json'),
    music: require('P:/Public Folder/AssetPackV2Lite/archive/data/music.json'),
    comics: require('P:/Public Folder/AssetPackV2Lite/archive/data/comics.json'),
    extras: require('P:/Public Folder/AssetPackV2Lite/archive/data/extras.json'),
    tweaks: require('P:/Public Folder/AssetPackV2Lite/archive/data/tweaks.json'),
    audioData: {},
    flags: {}
  }

  data.tweaks.tzPasswordPages = Object.values(data.mspa.story)
    .filter(v => v.flag.includes('TZPASSWORD'))
    .map(v => v.pageId)

  return data
}

window.isWebApp = true
window.webAppArchive = loadArchiveData()

require('../src/main')

// execute with
// (cd "L:/Archive/Homestuck/TUHC/Asset Pack V2/"; python3 -m http.server) & yarn serve