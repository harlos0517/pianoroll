/* PIXI ALIAS */
const App          = PIXI.Application
const loader       = PIXI.loader
const resource     = PIXI.loader.resources
const Sprite       = PIXI.Sprite
const Container    = PIXI.Container
const TextureCache = PIXI.utils.TextureCache
const Graphics     = PIXI.Graphics
const Ticker       = PIXI.Ticker

/* CONFIGURATION */
// pianoroll layout
var startKey       =   21 // Must be on white-key
var endKey         =  108 // Must be on white-key
var whiteKeyNum    =   52
var blackKeyNum    =   36
var keyNum         = endKey - startKey + 1
var appWidth       = 1920
var appHeight      = 1080
var pianoWidth     = appWidth * .8
var whiteKeyWidth  = pianoWidth / whiteKeyNum
var whiteKeyHeight = whiteKeyWidth * 5.5
var blackKeyWidth  = whiteKeyWidth * .6
var blackKeyHeight = whiteKeyWidth * 3.5
var keyRadius      = whiteKeyWidth / 5
var pianoHeight    = whiteKeyHeight
var paddingLR      = (appWidth - pianoWidth) / 2
var paddingTB      = appHeight * 0.1
var noteAreaHeight = appHeight - pianoHeight - paddingTB * 2
var noteName       = ['C','C#','D','Eb','E','F','F#','G','G#','A','Bb','B']
var noteMarginLR   = 3
var renderBuffer   = 100

// MIDI
var speed          = 0.4 // px:ms
var midiFile       = 'demo.mid'
var midiDelay      = 1500 // ms
var defaultBpm     = 80
var audioFile      = 'demo.mp3'
var audioOffset    = 0 // ms
var audioDelay     = 20 // ms
var playbackListen = true
var curEventListen = 0
var accelRatio     = 1.0

// app settings
var app = new App({
	width: appWidth,
	height: appHeight,
	antialias:   true,
	transparent: false,
	autoResize:  true,
	resolution:  1,
})

// sound
var sound = new Howl({
	src: [audioFile],
	autoplay: false,
  loop: false,
  volume: 0.8/accelRatio,
  rate: accelRatio
})

/* PARAMETERS */
// timer
var frameUpdate
var secondUpdate
var frames = 0
var ms = 0.0
var secondTicker = 0

// sprite and masks and sound and midi
var pianoKeys = new Container()
var pianoNotes = new Container()
var pianoNotesArea = new Container()
var mask = new Graphics()
var midiJson = []

/* SCALING */
// scaling to window
function reScale() { scaleToWindow(app.view, '#333333') }
window.addEventListener('resize',reScale)
$('body>.wrap').apnd(app.view)
reScale()

/* LOAD ASSETS */
// load images and sounds and midi
loader.add([
	'whiteKeyDefault.svg',
	'whiteKeyPressed.svg',
	'whiteKeyActiveLeft.svg',
	'whiteKeyActiveRight.svg',
	'blackKeyDefault.svg',
	'blackKeyPressed.svg',
	'blackKeyActiveLeft.svg',
	'blackKeyActiveRight.svg'
]).load(()=>{
	sound.once('load',()=>{
		midi2json(midiFile,d=>{
			midiJson = modifyJson(d)
			setup()
		})
	})
})

/* FUNCTIONS */
// note function
function isWhiteKey(i) {
	var mod = i % 12
	return (mod==0 || mod==2 || mod==4 || mod==5 || mod==7 || mod==9 || mod==11)
}

function isBlackKey(i) {
	return !isWhiteKey(i)
}

function getNoteName(i) {
	var mod = i % 12
	return noteName [mod]
}

// piano roll rendering
function getWhiteKeyIndex(i) {
	var whiteKey = i
	if(!isWhiteKey(i)) whiteKey++
	var mod = whiteKey%12
	var oct = Math.floor(whiteKey/12)
	var newmod = Math.floor(mod/2) + mod%2
	return 7*oct+newmod
}

function getLeftPos(i) {
	var dist = getWhiteKeyIndex(i)-getWhiteKeyIndex(startKey)
	return whiteKeyWidth*dist-(isWhiteKey(i)?0:(blackKeyWidth/2))
}

function addKey(i) {
	var key = new Sprite(resource[isWhiteKey(i)?'whiteKeyDefault.svg':'blackKeyDefault.svg'].texture)
	key.noteId = i
	pianoKeys.addChild(key)
	key.x = getLeftPos(i)
	key.y = 0
	key.width  = isWhiteKey(i)?whiteKeyWidth :blackKeyWidth 
	key.height = isWhiteKey(i)?whiteKeyHeight:blackKeyHeight
}

function addAllKeys() {
	// add white keys first, then black key
	for(var i=startKey; i<=endKey; i++) if(isWhiteKey(i)) addKey(i)
	for(var i=startKey; i<=endKey; i++) if(isBlackKey(i)) addKey(i)
	pianoKeys.x = paddingLR
	pianoKeys.y = paddingTB+noteAreaHeight
	app.stage.addChild(pianoKeys)
}

// parse MIDI data
function modifyJson(json) {
	// parse midi data
	var newData = []
	var inproc = []
	var tick = 0
	var time = 0 // ms
	var ticksPerBeat = json.header.ticksPerBeat
	var curMsPerTick = 60000 / ticksPerBeat / defaultBpm 
	for(var e of json.tracks[0]){
		// deltaTime is actually deltaTick
		tick += e.deltaTime
		time += e.deltaTime * curMsPerTick
		e.time = time
		var index = inproc.findIndex(note=>note.noteNumber==e.noteNumber)
		if (e.type === 'noteOn'){
			if(index>=0){
				var obj = inproc[index]
				obj.endTime = time
				obj.length = time - obj.startTime
				obj.id = newData.length
				newData.push(obj)
				inproc.splice(index,1)
			}
			var newObj = {}
			newObj.startTime = time
			newObj.channel = 0
			newObj.noteNumber = e.noteNumber
			newObj.velocity = e.velocity
			inproc.push(newObj)
		}
		else if (e.type === 'noteOff') {
			if(index>=0){
				var obj = inproc[index]
				obj.endTime = time
				obj.length = time - obj.startTime
				obj.id = newData.length
				newData.push(obj)
				inproc.splice(index,1)
			}
		}
		else if (e.type === 'setTempo') {
			var curMsPerTick = e.microsecondsPerBeat / ticksPerBeat / 1000
		}
	}
	// sort
	newData.sort((a,b)=>a.startTime-b.startTime)
	return newData
}

// note rendering
var renderStart = 0
var renderNum = 0

function noteAreaInit() {
	// create mask
	mask.beginFill(0xffffff)
	mask.drawRect(paddingLR, paddingTB, pianoWidth, noteAreaHeight)
	mask.endFill()

	// render notearea
	midiJson.forEach((ne,ni,na)=>{
		var i = ne.noteNumber
		var note = new Graphics()
		note.x = getLeftPos(i) + noteMarginLR
		note.y = 0 - ne.endTime * speed
		var width = (isWhiteKey(i)?whiteKeyWidth:blackKeyWidth) - noteMarginLR * 2
		var height = ne.length * speed
		var r = keyRadius
		note.beginFill(isWhiteKey(i)?0xFFFFAA:0x666644)
		note.drawRoundedRect(0,0,width,height,r)
		note.endFill()
		note.visible = false
		pianoNotes.addChild(note)
	})
	pianoNotes.x = 0
	pianoNotes.y = noteAreaHeight
	pianoNotesArea.addChild(pianoNotes)
	pianoNotesArea.mask = mask
	pianoNotesArea.x = paddingLR
	pianoNotesArea.y = paddingTB
	app.stage.addChild(pianoNotesArea)
	renderNotes(0)
}

function toggleRender(obj) {
	// var yDiff = mask.toLocal(obj,mask).y
	// TODO: unknown usage toLocal
	// workaround:
	var yDiff = obj.getGlobalPosition().y - mask.getGlobalPosition().y

	var after = (yDiff+obj.height)<(0-renderBuffer)?true:false
	var before = yDiff>(mask.height+renderBuffer)?true:false
	var inside = (after||before)?false:true
	renderNum += !(obj.visible===inside)?(inside?1:-1):0
	obj.visible = inside?true:false
	return after?'after':(before?'before':'inside')
}

// optimization (do not render things outside the area)
function renderNotes(x) {
	var listen = true
	for (var i=(x!==undefined)?x:renderStart;i<pianoNotes.children.length;i++) {
		var status = toggleRender(pianoNotes.children[i])
		if (listen && status==='inside') {
			listen = false
			renderStart = i
		}
		if (status==='after' || i>=pianoNotes.children.length-1) {
			renderEnd = i
			break
		}
		//console.log(status)
	}
}

// playback
function updateNoteArea() {
	pianoNotes.y = noteAreaHeight + (ms * accelRatio - midiDelay) * speed
}

function audioPlaybackListener() {
	if (playbackListen && ms * accelRatio>=midiDelay - audioOffset + audioDelay) {
		sound.play()
		playbackListen = false
	}
}

function updatePianoKeys() {
	while (curEventListen < midiJson.length && ms * accelRatio >= midiJson[curEventListen].startTime + midiDelay){
		var e = midiJson[curEventListen]
		var obj = pianoKeys.children.find(x=>x.noteId==e.noteNumber)
		if (obj) {
			var i = obj.noteId
			if      (e.type === 'noteOn'){
				obj.texture = TextureCache[isWhiteKey(i)?'whiteKeyActiveLeft.svg':'blackKeyActiveLeft.svg']
			}
			else if (e.type === 'noteOff'){
				obj.texture = TextureCache[isWhiteKey(i)?'whiteKeyDefault.svg':'blackKeyDefault.svg']
			}
		}
		curEventListen ++
	}
}

/* STATES */
// timer event triggering
function gameLoop(delta) {
	frames += 1
	ms += app.ticker.elapsedMS

	secondTicker += app.ticker.elapsedMS
	if(secondTicker >= 1000.0) {
		secondUpdate()
		secondTicker %= 1000.0
	}

	frameUpdate()
}

// setup
function setup() {
	addAllKeys()
	noteAreaInit()
	// start loop, trigger events
	frameUpdate = play
	secondUpdate = log
	app.ticker.add(gameLoop)
}

// playback
function play() {
	audioPlaybackListener()
	updatePianoKeys()
	updateNoteArea()
	renderNotes(0)
}

function log() {
	console.log('FPS:'+app.ticker.FPS.toFixed(2))
	console.log('rendered:'+renderNum)
}

function end() {}